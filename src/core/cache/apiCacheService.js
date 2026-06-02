'use strict'

/**
 * Generic Redis cache for GET API responses.
 * Returns the loader result unchanged (no from_cache in response).
 */

const Redis = require('ioredis')
const { REDIS_URL, API_CACHE_TTL_SECONDS } = require('../config/env')

const LOG_PREFIX = '[ApiCache]'
const API_CACHE_PREFIX = 'api:'
const DEFAULT_TTL_SECONDS = API_CACHE_TTL_SECONDS

const KEYS = {
  organizations: () => 'organization:all',
  typeProcesses: () => 'typeProcess:all',
  departmentLeaves: (organizationId) => `department:leaves:${organizationId}`,
  rolesByDepartment: (departmentId) => `role:by-dept:${departmentId}`,
  locations: () => 'location:all',
  documentTemplates: () => 'document-templates:active',
  stageConfig: (processId) => `stage-config:process:${processId}`,
  transactionDraft: (userId, processId) => `transaction:draft:${userId}:${processId}`,
  createDraft: (userId, processId) => `transaction:create-draft:${userId}:${processId}`,
  transactionById: (userId, transactionId) => `transaction:by-id:${userId}:${transactionId}`
}

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

  return redisClient
}

async function ensureConnected () {
  if (!REDIS_URL) {
    return false
  }

  try {
    if (!redisClient) {
      createRedisClient(REDIS_URL)
    }

    if (redisClient.status !== 'ready') {
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
      } else {
        await redisClient.connect()
      }
    }

    await redisClient.ping()
    return true
  } catch (err) {
    resetRedisClient()
    return false
  }
}

function toPlain (value) {
  if (value == null) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(toPlain)
  }

  if (typeof value.get === 'function') {
    return value.get({ plain: true })
  }

  if (typeof value === 'object') {
    const plain = {}

    for (const [key, nested] of Object.entries(value)) {
      plain[key] = toPlain(nested)
    }

    return plain
  }

  return value
}

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
    console.warn(`${LOG_PREFIX} read failed (${key}):`, err.message)
    return null
  }
}

async function setCachedJson (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!(await ensureConnected())) {
    return false
  }

  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    return true
  } catch (err) {
    console.warn(`${LOG_PREFIX} write failed (${key}):`, err.message)
    return false
  }
}

async function deleteKeysByPattern (pattern) {
  if (!(await ensureConnected())) {
    return 0
  }

  try {
    const keys = await redisClient.keys(`${API_CACHE_PREFIX}${pattern}`)

    if (!keys.length) {
      return 0
    }

    await redisClient.del(...keys)
    return keys.length
  } catch (err) {
    console.warn(`${LOG_PREFIX} delete pattern failed (${pattern}):`, err.message)
    return 0
  }
}

async function deleteKey (cacheKey) {
  if (!(await ensureConnected())) {
    return
  }

  try {
    await redisClient.del(`${API_CACHE_PREFIX}${cacheKey}`)
  } catch (err) {
    console.warn(`${LOG_PREFIX} delete failed (${cacheKey}):`, err.message)
  }
}

function logHit ({ label, fullKey }) {
  console.log('⚡ data from Redis cache')
  console.log(`${LOG_PREFIX} CACHE HIT — source: REDIS — ${label} — key: ${fullKey}`)
}

function logMiss ({ label, fullKey, durationMs, cached }) {
  console.log('🐢 data from DATABASE')
  console.log(
    `${LOG_PREFIX} CACHE MISS — source: DATABASE — ${label} — key: ${fullKey} — ${durationMs}ms` +
    (cached ? ` — saved to Redis (TTL=${DEFAULT_TTL_SECONDS}s)` : ' — Redis unavailable, not cached')
  )
}

async function getOrLoad (cacheKey, loader, options = {}) {
  const label = options.label || cacheKey
  const fullKey = `${API_CACHE_PREFIX}${cacheKey}`
  const cached = await getCachedJson(fullKey)

  if (cached !== null) {
    logHit({ label, fullKey })
    return cached
  }

  const start = Date.now()
  const data = await loader()
  const plain = toPlain(data)
  const durationMs = Date.now() - start
  const saved = await setCachedJson(fullKey, plain, options.ttlSeconds)

  logMiss({ label, fullKey, durationMs, cached: saved })

  return plain
}

async function invalidateOrganizations () {
  const count = await deleteKey(KEYS.organizations())
  console.log(`${LOG_PREFIX} invalidate organizations (${count ? 1 : 0} key)`)
}

async function invalidateTypeProcesses () {
  const count = await deleteKey(KEYS.typeProcesses())
  console.log(`${LOG_PREFIX} invalidate type processes (${count ? 1 : 0} key)`)
}

async function invalidateDepartmentLeaves (organizationId = null) {
  if (organizationId != null) {
    await deleteKey(KEYS.departmentLeaves(organizationId))
    console.log(`${LOG_PREFIX} invalidate department leaves — org ${organizationId}`)
    return
  }

  const count = await deleteKeysByPattern('department:leaves:*')
  console.log(`${LOG_PREFIX} invalidate all department leaves (${count} key(s))`)
}

async function invalidateRolesByDepartment (departmentId = null) {
  if (departmentId != null) {
    await deleteKey(KEYS.rolesByDepartment(departmentId))
    console.log(`${LOG_PREFIX} invalidate roles — dept ${departmentId}`)
    return
  }

  const count = await deleteKeysByPattern('role:by-dept:*')
  console.log(`${LOG_PREFIX} invalidate all roles by department (${count} key(s))`)
}

async function invalidateLocations () {
  const count = await deleteKey(KEYS.locations())
  console.log(`${LOG_PREFIX} invalidate locations (${count ? 1 : 0} key)`)
}

async function invalidateDocumentTemplates () {
  const count = await deleteKey(KEYS.documentTemplates())
  console.log(`${LOG_PREFIX} invalidate document templates (${count ? 1 : 0} key)`)
}

async function invalidateStageConfig (processId = null) {
  if (processId != null) {
    await deleteKey(KEYS.stageConfig(processId))
    console.log(`${LOG_PREFIX} invalidate stage config — process ${processId}`)
    return
  }

  const count = await deleteKeysByPattern('stage-config:process:*')
  console.log(`${LOG_PREFIX} invalidate all stage configs (${count} key(s))`)
}

async function invalidateTransactionDraft (userId, processId) {
  if (userId == null || processId == null) {
    return
  }

  await deleteKey(KEYS.transactionDraft(userId, processId))
  await deleteKey(KEYS.createDraft(userId, processId))
  console.log(`${LOG_PREFIX} invalidate transaction draft — user ${userId}, process ${processId}`)
}

async function invalidateTransactionById (userId, transactionId) {
  if (userId == null || transactionId == null) {
    return
  }

  await deleteKey(KEYS.transactionById(userId, transactionId))
  console.log(`${LOG_PREFIX} invalidate transaction — user ${userId}, id ${transactionId}`)
}

async function invalidateUserTransactionDrafts (userId) {
  if (userId == null) {
    return
  }

  const draftCount = await deleteKeysByPattern(`transaction:draft:${userId}:*`)
  const createDraftCount = await deleteKeysByPattern(`transaction:create-draft:${userId}:*`)
  console.log(
    `${LOG_PREFIX} invalidate transaction caches for user ${userId} ` +
    `(draft: ${draftCount}, create-draft: ${createDraftCount} key(s))`
  )
}

async function invalidateAllTransactionsForUser (userId) {
  if (userId == null) {
    return
  }

  const count = await deleteKeysByPattern(`transaction:*:${userId}:*`)
  console.log(`${LOG_PREFIX} invalidate all transactions for user ${userId} (${count} key(s))`)
}

module.exports = {
  KEYS,
  getOrLoad,
  invalidateOrganizations,
  invalidateTypeProcesses,
  invalidateDepartmentLeaves,
  invalidateRolesByDepartment,
  invalidateLocations,
  invalidateDocumentTemplates,
  invalidateStageConfig,
  invalidateTransactionDraft,
  invalidateTransactionById,
  invalidateUserTransactionDrafts,
  invalidateAllTransactionsForUser
}
