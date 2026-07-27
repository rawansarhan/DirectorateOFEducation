'use strict'

/**
 * خادم إشعارات WebSocket — بديل FCM لتطبيق سطح مكتب Windows.
 *
 * يُركَّب على **نفس خادم HTTP الخاص بـ Express** (المنفذ 4000) عبر [attach]، فلا
 * يحتاج منفذًا ثانيًا ولا شهادة wss منفصلة، ويعمل خلف Nginx على المسار `/ws`.
 * العميل (push_socket.dart) يتصل بـ:
 *
 *     wss://host/ws?token=<access_jwt>
 *
 * ويُمرّر access token كـ query parameter. هذا الخادم:
 *   - يتحقق من الـ JWT بنفس سرّ الـ backend (JWT_ACCESS_SECRET || JWT_SECRET).
 *   - يسجّل كل اتصال تحت معرّف المستخدم (decoded.id) ليُمكن الاستهداف لاحقًا.
 *   - يردّ على إطارات ping التطبيقية بـ pong (يُكمّل آلية keep-alive في العميل).
 *   - يوفّر دالّتي broadcast / sendToUser لإرسال { title, body, payload } من
 *     بقية الـ backend، مع إشعار تجريبي دوري اختياري للتأكد من العرض.
 *
 * الاستخدام:
 *   - ضمن السيرفر (الإنتاج):  require('./core/notifications/wsNotificationServer').attach(httpServer)
 *   - تشغيل مستقل (تطوير):     node src/core/notifications/wsNotificationServer.js
 */

const http = require('http')
const jwt = require('jsonwebtoken')
const { WebSocketServer } = require('ws')
const {
  JWT_ACCESS_SECRET,
  WS_PATH,
  WS_PORT,
  WS_DEMO,
  WS_DEMO_INTERVAL_MS
} = require('../config/env')

/** اتصالات حيّة مفهرسة بمعرّف المستخدم: userId -> Set<WebSocket>. */
const clientsByUser = new Map()

function register (userId, ws) {
  if (!clientsByUser.has(userId)) clientsByUser.set(userId, new Set())
  clientsByUser.get(userId).add(ws)
}

function unregister (userId, ws) {
  const set = clientsByUser.get(userId)
  if (!set) return
  set.delete(ws)
  if (set.size === 0) clientsByUser.delete(userId)
}

/** يستخرج access token من الـ query param `token`. */
function extractToken (requestUrl) {
  try {
    const parsed = new URL(requestUrl, 'http://localhost')
    return parsed.searchParams.get('token')
  } catch (_) {
    return null
  }
}

/** يبثّ إشعارًا لكل المتصلين. الشكل: { title, body, payload }. */
function broadcast ({ title, body, payload }) {
  const message = JSON.stringify({ title, body, payload })
  for (const set of clientsByUser.values()) {
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) ws.send(message)
    }
  }
}

/** يرسل إشعارًا لمستخدم محدّد (لكل أجهزته المتصلة). */
function sendToUser (userId, { title, body, payload }) {
  const set = clientsByUser.get(userId)
  if (!set) return
  const message = JSON.stringify({ title, body, payload })
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(message)
  }
}

let _demoTimer = null

/**
 * يُركّب خادم الـ WebSocket على خادم HTTP قائم (Express).
 *
 * يعترض حدث 'upgrade' فقط للطلبات على [WS_PATH]، ويصادق الـ JWT قبل إتمام
 * المصافحة (فيرفض غير المصرّح مبكّرًا)، ويترك بقية الطلبات لـ Express.
 * يُعيد مرجعًا فيه broadcast / sendToUser / detach.
 */
function attach (server) {
  // noServer: نتحكّم بالترقية يدويًّا في حدث 'upgrade'.
  const wss = new WebSocketServer({ noServer: true })

  const onUpgrade = (req, socket, head) => {
    let pathname
    try {
      pathname = new URL(req.url, 'http://localhost').pathname
    } catch (_) {
      pathname = null
    }

    // ليست ترقية على مسارنا → اتركها (قد يتعامل معها مستمع 'upgrade' آخر).
    if (pathname !== WS_PATH) return

    const token = extractToken(req.url)
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    let decoded
    try {
      decoded = jwt.verify(token, JWT_ACCESS_SECRET)
    } catch (_) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.userId = decoded.id
      wss.emit('connection', ws, req)
    })
  }

  server.on('upgrade', onUpgrade)

  wss.on('connection', (ws) => {
    const userId = ws.userId
    register(userId, ws)
    console.log(
      `[ws] متصل: user=${userId} (إجمالي المستخدمين: ${clientsByUser.size})`
    )

    // إشعار ترحيبي فوري للتأكد من سلامة المسار من الطرف إلى الطرف.
    ws.send(
      JSON.stringify({
        title: 'مرحبًا',
        body: 'تم الاتصال بخادم الإشعارات بنجاح.',
        payload: { type: 'welcome', userId }
      })
    )

    ws.on('message', (raw) => {
      // نتعامل فقط مع إطار ping التطبيقي الذي يرسله العميل كل 30ث.
      let frame
      try {
        frame = JSON.parse(raw.toString())
      } catch (_) {
        return // رسالة غير صالحة — تجاهُل آمن.
      }
      if (frame && frame.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    })

    ws.on('close', () => {
      unregister(userId, ws)
      console.log(`[ws] انقطع: user=${userId}`)
    })

    ws.on('error', (err) => {
      console.error(`[ws] خطأ على اتصال user=${userId}:`, err.message)
    })
  })

  console.log(`[ws] خادم الإشعارات مُركَّب على المسار ${WS_PATH}`)

  // إشعار تجريبي دوري (اختياري) للتحقق من العرض من الطرف إلى الطرف.
  if (WS_DEMO && !_demoTimer) {
    let counter = 0
    _demoTimer = setInterval(() => {
      counter += 1
      broadcast({
        title: 'إشعار تجريبي',
        body: `رسالة رقم ${counter} من خادم الإشعارات.`,
        payload: { type: 'demo', counter }
      })
    }, WS_DEMO_INTERVAL_MS)
  }

  return {
    wss,
    broadcast,
    sendToUser,
    detach () {
      if (_demoTimer) {
        clearInterval(_demoTimer)
        _demoTimer = null
      }
      server.removeListener('upgrade', onUpgrade)
      wss.close()
    }
  }
}

/**
 * تشغيل مستقل (تطوير محلي): يفتح خادم HTTP خاصًّا على [WS_PORT] ويُركّب عليه
 * الـ ws. للإنتاج استخدم [attach] على خادم Express بدلًا من هذا.
 */
function start () {
  const server = http.createServer((req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain' })
    res.end('Upgrade Required: WebSocket only')
  })
  const handle = attach(server)
  server.listen(WS_PORT, () => {
    console.log(
      `[ws] (مستقل) خادم إشعارات WebSocket على ws://localhost:${WS_PORT}${WS_PATH}`
    )
  })
  return {
    ...handle,
    server,
    stop () {
      handle.detach()
      server.close()
    }
  }
}

// تشغيل مباشر:  node src/core/notifications/wsNotificationServer.js
if (require.main === module) {
  require('dotenv').config()
  start()
}

module.exports = { attach, start, broadcast, sendToUser }
