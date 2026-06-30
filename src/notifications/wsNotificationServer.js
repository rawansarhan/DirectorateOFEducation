'use strict'

/**
 * خادم إشعارات WebSocket (stub جاهز للإنتاج) — بديل FCM لتطبيق سطح مكتب Windows.
 *
 * مستقلّ تمامًا عن Express: يفتح خادم `ws` على منفذ منفصل (WS_PORT، الافتراضي
 * 4100) كي لا يتداخل مع الـ REST API. العميل (push_socket.dart) يتصل بـ:
 *
 *     wss://host/ws?token=<access_jwt>
 *
 * ويُمرّر access token كـ query parameter. هذا الخادم:
 *   - يتحقق من الـ JWT بنفس سرّ الـ backend (JWT_ACCESS_SECRET || JWT_SECRET).
 *   - يسجّل كل اتصال تحت معرّف المستخدم (decoded.id) ليُمكن الاستهداف لاحقًا.
 *   - يردّ على إطارات ping التطبيقية بـ pong (يُكمّل آلية keep-alive في العميل).
 *   - يبثّ رسالة تجريبية { title, body, payload } دوريًّا للتأكد من العرض،
 *     ويوفّر دالّتي broadcast / sendToUser لإرسالها من بقية الـ backend.
 *
 * التشغيل المستقل:   node src/notifications/wsNotificationServer.js
 * أو ضمن السيرفر:    require('./notifications/wsNotificationServer').start()
 *
 * متطلّب:  npm install ws        (حزمة ws غير مثبّتة بعد في هذا المشروع)
 */

const http = require('http')
const jwt = require('jsonwebtoken')
const { WebSocketServer } = require('ws')

// نفس منطق اشتقاق السرّ المستخدَم في tokenService.js / authMiddleware.js
// كي يتطابق التحقق هنا مع توقيع الـ access token في الـ backend.
const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET ||
  'your_very_secret_key'

const WS_PORT = Number(process.env.WS_PORT) || 4100
const WS_PATH = process.env.WS_PATH || '/ws'

// تفعيل رسالة تجريبية دورية (مفيد للتطوير/التحقق من الـ Definition of Done).
// أوقفها في الإنتاج عبر WS_DEMO=false.
const DEMO_ENABLED = process.env.WS_DEMO !== 'false'
const DEMO_INTERVAL_MS = Number(process.env.WS_DEMO_INTERVAL_MS) || 15000

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

function start () {
  // خادم HTTP خفيف نُرفق به ترقية الـ WebSocket كي نتحكّم بالمسار والمصادقة
  // قبل إتمام المصافحة (نرفض الاتصالات غير المصرّح بها مبكّرًا).
  const server = http.createServer((req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain' })
    res.end('Upgrade Required: WebSocket only')
  })

  // noServer: نتحكّم بالترقية يدويًّا في حدث 'upgrade'.
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (pathname !== WS_PATH) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }

    const token = extractToken(req.url)
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    let decoded
    try {
      decoded = jwt.verify(token, ACCESS_SECRET)
    } catch (_) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.userId = decoded.id
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws) => {
    const userId = ws.userId
    register(userId, ws)
    console.log(`[ws] متصل: user=${userId} (إجمالي المستخدمين: ${clientsByUser.size})`)

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

  server.listen(WS_PORT, () => {
    console.log(
      `[ws] خادم إشعارات WebSocket يعمل على ws://localhost:${WS_PORT}${WS_PATH}`
    )
  })

  // رسالة تجريبية دورية (للتطوير/التحقق). تُبثّ لكل المتصلين.
  let demoTimer = null
  if (DEMO_ENABLED) {
    let counter = 0
    demoTimer = setInterval(() => {
      counter += 1
      broadcast({
        title: 'إشعار تجريبي',
        body: `رسالة رقم ${counter} من خادم الإشعارات.`,
        payload: { type: 'demo', counter }
      })
    }, DEMO_INTERVAL_MS)
  }

  return {
    wss,
    server,
    broadcast,
    sendToUser,
    stop () {
      if (demoTimer) clearInterval(demoTimer)
      wss.close()
      server.close()
    }
  }
}

// تشغيل مباشر:  node src/notifications/wsNotificationServer.js
if (require.main === module) {
  require('dotenv').config()
  start()
}

module.exports = { start, broadcast, sendToUser }
