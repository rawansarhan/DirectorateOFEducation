'use strict'

/**
 * =====================================================
 * Process Cache Service (Redis)
 * =====================================================
 * - يخزّن قوائم المعاملات (شكوى / حسب النوع / مواطن)
 * - أول طلب: DB → Redis
 * - الطلبات التالية: Redis مباشرة
 * - عند create ProcessDefinition: invalidateAllProcessLists()
 * =====================================================
 */

const Redis = require('ioredis')
const { REDIS_URL, PROCESS_CACHE_TTL_SECONDS } = require('../config/env')

const LOG_PREFIX = '[ProcessCache]'

/** بادئة مفاتيح قوائم المعاملات في Redis */
const CACHE_PREFIX = 'process:list:'

/** مفتاح ثابت لحفظ organization_department_roles.id للمواطن (CITIZEN) */
const CITIZEN_ODR_KEY = 'odr:citizen'

/** مدة بقاء الكاش بالثواني */
const DEFAULT_TTL_SECONDS = PROCESS_CACHE_TTL_SECONDS

const SEP = '─'.repeat(52)

let redisClient = null

function resetRedisClient () {
  if (!redisClient) {
    return
  }

  try {
    redisClient.removeAllListeners()
    redisClient.disconnect(false)
  } catch {}

  redisClient = null
}

function createRedisClient (url) {
  resetRedisClient()

  redisClient = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) {
        return null
      }

      return Math.min(times * 200, 1000)
    }
  })

  redisClient.on('error', (err) => {
    console.error(`${LOG_PREFIX} Redis error:`, err.message)
  })

  redisClient.on('connect', () => {
    console.log(`${LOG_PREFIX} Connected to Redis`)
  })

  return redisClient
}

async function connectRedis (url) {
  if (!redisClient) {
    createRedisClient(url)
  }

  if (redisClient.status === 'ready') {
    return redisClient
  }

  if (redisClient.status === 'connecting') {
    await new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup()
        resolve()
      }
      const onError = (err) => {
        cleanup()
        reject(err)
      }
      const cleanup = () => {
        redisClient.removeListener('ready', onReady)
        redisClient.removeListener('error', onError)
      }

      redisClient.once('ready', onReady)
      redisClient.once('error', onError)
    })

    return redisClient
  }

  await redisClient.connect()
  return redisClient
}

function isRedisEnabled () {
  return Boolean(REDIS_URL)
}

function logBlock (lines) {
  console.log(`${LOG_PREFIX} ${SEP}`)
  lines.forEach((line) => console.log(`${LOG_PREFIX} ${line}`))
  console.log(`${LOG_PREFIX} ${SEP}`)
}

function logCacheHit ({ label, fullKey, count }) {
  console.log('⚡ data from Redis cache')
  logBlock([
    'CACHE HIT — source: REDIS',
    `   operation: ${label}`,
    `   key: ${fullKey}`,
    `   count: ${count} item(s)`
  ])
}

function logDbFetch ({ label, fullKey, count, durationMs, cached }) {
  console.log('🐢 data from DATABASE')
  const lines = [
    'CACHE MISS — source: DATABASE (PostgreSQL)',
    `   operation: ${label}`,
    `   key: ${fullKey}`,
    `   count: ${count} item(s)`,
    `   query time: ${durationMs}ms`
  ]

  if (cached) {
    lines.push(`   saved to Redis (TTL=${DEFAULT_TTL_SECONDS}s)`)
  } else {
    lines.push('   Redis unavailable — not cached')
  }

  logBlock(lines)
}

function logCitizenOdrHit (id) {
  console.log('⚡ data from Redis cache')
  logBlock([
    'CACHE HIT — source: REDIS',
    '   operation: CITIZEN organization_department_roles',
    `   id: ${id}`
  ])
}

function logCitizenOdrDb ({ id, durationMs, cached }) {
  console.log('🐢 data from DATABASE')
  logBlock([
    'CACHE MISS — source: DATABASE (organization service)',
    '   operation: CITIZEN organization_department_roles',
    `   id: ${id}`,
    `   query time: ${durationMs}ms`,
    cached
      ? `   saved to Redis (TTL=${DEFAULT_TTL_SECONDS}s)`
      : '   Redis unavailable — not cached'
  ])
}

/**
 * التحقق أن Redis جاهز — مع إعادة محاولة الاتصال إذا كان متوقفاً سابقاً
 */
async function ensureConnected () {
  if (!REDIS_URL) {
    console.warn(`${LOG_PREFIX} REDIS_URL is not set — running without cache`)
    return false
  }

  try {
    await connectRedis(REDIS_URL)
    await redisClient.ping()
    return true
  } catch (err) {
    console.warn(`${LOG_PREFIX} Redis ping failed: ${err.message} — retrying...`)
    resetRedisClient()

    try {
      await connectRedis(REDIS_URL)
      await redisClient.ping()
      console.log(`${LOG_PREFIX} Redis reconnected successfully`)
      return true
    } catch (retryErr) {
      console.warn(`${LOG_PREFIX} Redis unavailable:`, retryErr.message)
      resetRedisClient()
      return false
    }
  }
}

/**
 * بناء مفتاح ثابت من roleIds — مرتبة لتجنب تكرار الكاش
 * مثال: [3, 1, 2] → "1,2,3"
 */
function buildRoleKey (roleIds = []) {
  return [...new Set(roleIds.map(Number))].sort((a, b) => a - b).join(',')
}

/** قراءة JSON من Redis */
async function getCachedJson (key) {
  if (!(await ensureConnected())) {
    return null
  }

  try {
    const raw = await redisClient.get(key)

    if (!raw) {
      return null
    }

    return JSON.parse(raw)
  } catch (err) {
    console.warn(`${LOG_PREFIX} failed to read key ${key}:`, err.message)
    return null
  }
}

/** كتابة JSON إلى Redis مع TTL — يرجع true إذا نجح الحفظ */
async function setCachedJson (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!(await ensureConnected())) {
    return false
  }

  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    return true
  } catch (err) {
    console.warn(`${LOG_PREFIX} failed to write key ${key}:`, err.message)
    return false
  }
}

/**
 * Cache-Aside pattern:
 * 1. حاول Redis
 * 2. إذا miss → loader() من DB
 * 3. خزّن النتيجة في Redis
 */
async function getOrLoadProcessList (cacheKey, loader, options = {}) {
  const label = options.label || cacheKey
  const fullKey = `${CACHE_PREFIX}${cacheKey}`
  const cached = await getCachedJson(fullKey)

  if (cached) {
    const count = cached.data?.length ?? 0
    logCacheHit({ label, fullKey, count })
    return { ...cached, from_cache: true }
  }

  const start = Date.now()
  const data = await loader()
  const durationMs = Date.now() - start
  const count = data.data?.length ?? 0
  const saved = await setCachedJson(fullKey, data)

  logDbFetch({
    label,
    fullKey,
    count,
    durationMs,
    cached: saved
  })

  return { ...data, from_cache: false }
}

/** قراءة id دور المواطن من الكاش (organization_department_roles) */
async function getCachedCitizenOdrId () {
  const cached = await getCachedJson(CITIZEN_ODR_KEY)

  if (cached?.id) {
    logCitizenOdrHit(cached.id)
    return cached.id
  }

  return null
}

/** حفظ id دور المواطن في الكاش */
async function setCachedCitizenOdrId (odrRecord) {
  if (!odrRecord?.id) {
    return false
  }

  return setCachedJson(CITIZEN_ODR_KEY, {
    id: odrRecord.id,
    role_id: odrRecord.role_id
  })
}

/**
 * جلب CITIZEN ODR مع log واضح (كاش أو DB)
 */
async function getOrLoadCitizenOdrId (loader) {
  const cachedId = await getCachedCitizenOdrId()

  if (cachedId) {
    return cachedId
  }

  const start = Date.now()
  const record = await loader()
  const durationMs = Date.now() - start

  if (!record?.id) {
    throw new Error('دور المواطن (CITIZEN) غير موجود')
  }

  const saved = await setCachedCitizenOdrId(record)

  logCitizenOdrDb({
    id: record.id,
    durationMs,
    cached: saved
  })

  return record.id
}

/**
 * مسح كل قوائم المعاملات + دور المواطن
 * يُستدعى بعد POST /process_definitions/create
 */
async function invalidateAllProcessLists () {
  if (!(await ensureConnected())) {
    console.warn(`${LOG_PREFIX} skip invalidate — Redis unavailable`)
    return
  }

  try {
    const keys = await redisClient.keys(`${CACHE_PREFIX}*`)

    if (keys.length) {
      await redisClient.del(...keys)
      console.log(`${LOG_PREFIX} invalidate — deleted ${keys.length} list key(s)`)
    }

    await redisClient.del(CITIZEN_ODR_KEY)
    console.log(`${LOG_PREFIX} invalidate — cleared CITIZEN ODR cache`)
  } catch (err) {
    console.warn(`${LOG_PREFIX} invalidate failed:`, err.message)
  }
}

module.exports = {
  CACHE_PREFIX,
  buildRoleKey,
  getOrLoadProcessList,
  getCachedCitizenOdrId,
  setCachedCitizenOdrId,
  getOrLoadCitizenOdrId,
  invalidateAllProcessLists,
  isRedisEnabled
}
