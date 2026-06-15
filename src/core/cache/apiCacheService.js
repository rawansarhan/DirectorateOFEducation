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
  typeDocs: () => 'typeDoc:all',
  typeDocById: (id) => `typeDoc:id:${id}`,
  departmentLeaves: (organizationId) => `department:leaves:${organizationId}`,
  rolesByDepartment: (departmentId) => `role:by-dept:${departmentId}`,
  locations: () => 'location:all',
  documentTemplates: () => 'document-templates:active',
  textFields: () => 'text-fields:all',
  textDropdowns: () => 'text-dropdowns:all',
  radioGroups: () => 'radio-groups:all',
  checkLists: () => 'check-lists:all',
  datePickers: () => 'date-pickers:all',
  filePickers: () => 'file-pickers:all',
  authProcessesByType: (typeTransId) => `process:auth:typed:${typeTransId}`,
  authProcessesAll: () => 'process:auth:all',
  authComplaintProcesses: () => 'process:auth:complaint:all',
  stageConfig: (processId) => `stage-config:process:${processId}`,
  transactionDraft: (userId, processId) => `transaction:draft:${userId}:${processId}`,
  createDraft: (userId, processId) => `transaction:create-draft:${userId}:${processId}`,
  transactionById: (userId, transactionId) => `transaction:by-id:${userId}:${transactionId}`,
  employeeTasks: (userId, scope, page, limit) =>
    `employee-tasks:${userId}:${scope}:p${page}:l${limit}`,
  employeeActiveTaskList: (userId, filterScope) =>
    `employee-tasks:${userId}:active-list:${filterScope}`,
  employeeTasksByDepartments: (userId, departmentIds, status, page, limit, fromDate, toDate) => {
    const deptKey = [...departmentIds].sort((a, b) => a - b).join('-')
    const fromKey = fromDate ? fromDate.toISOString().slice(0, 10) : 'all'
    const toKey = toDate ? toDate.toISOString().slice(0, 10) : 'all'
    return `employee-tasks:${userId}:depts:${deptKey}:${status}:from${fromKey}:to${toKey}:p${page}:l${limit}`
  },
  employeeTaskStats: (userId, scope, departmentIds, periodKey = 'default') => {
    const deptKey = [...departmentIds].sort((a, b) => a - b).join('-')
    return `employee-task-stats:${userId}:${scope}:depts:${deptKey}:${periodKey}`
  }
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

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(toPlain)
  }

  if (typeof value.get === 'function') {
    return toPlain(value.get({ plain: true }))
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

function buildFullCacheKey (cacheKey) {
  return `${API_CACHE_PREFIX}${cacheKey}`
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

function countItems (data) {
  return Array.isArray(data) ? data.length : null
}

function redisStatusLabel () {
  return REDIS_URL ? 'on' : 'off'
}

async function deleteKey (cacheKey) {
  if (!(await ensureConnected())) {
    console.warn(
      `${LOG_PREFIX} DELETE skipped — Redis unavailable — key: ${API_CACHE_PREFIX}${cacheKey}`
    )
    return 0
  }

  try {
    const fullKey = `${API_CACHE_PREFIX}${cacheKey}`
    const deleted = await redisClient.del(fullKey)
    return deleted
  } catch (err) {
    console.warn(`${LOG_PREFIX} delete failed (${cacheKey}):`, err.message)
    return 0
  }
}

function logHit ({ label, fullKey, itemCount, source = 'REDIS' }) {
  const itemsSuffix =
    itemCount != null ? ` — items: ${itemCount}` : ''

  console.log(source === 'MEMORY' ? '⚡ data from memory cache' : '⚡ data from Redis cache')
  console.log(
    `${LOG_PREFIX} CACHE HIT — source: ${source} — ${label} — key: ${fullKey}${itemsSuffix} — redis: ${redisStatusLabel()}`
  )
}

function logMiss ({ label, fullKey, durationMs, cached, itemCount, ttlSeconds = DEFAULT_TTL_SECONDS }) {
  const itemsSuffix =
    itemCount != null ? ` — items: ${itemCount}` : ''

  console.log('🐢 data from DATABASE')
  console.log(
    `${LOG_PREFIX} CACHE MISS — source: DATABASE — ${label} — key: ${fullKey} — ${durationMs}ms${itemsSuffix}` +
    (cached
      ? ` — saved to Redis (TTL=${ttlSeconds}s, redis=${redisStatusLabel()})`
      : ` — Redis unavailable, memory fallback only (redis=${redisStatusLabel()})`)
  )
}

function logInvalidate ({ module, fullKey, deleted }) {
  console.log('🗑️ cache invalidated')
  console.log(
    `${LOG_PREFIX} INVALIDATE — module: ${module} — key: ${fullKey} — deleted: ${deleted} key(s) — redis: ${redisStatusLabel()}`
  )
}

async function getOrLoad (cacheKey, loader, options = {}) {
  const label = options.label || cacheKey
  const fullKey = buildFullCacheKey(cacheKey)
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS
  const cached = await getCachedJson(fullKey)

  if (cached !== null) {
    logHit({
      label,
      fullKey,
      itemCount: countItems(cached)
    })
    return cached
  }

  const start = Date.now()
  const data = await loader()
  const plain = toPlain(data)
  const durationMs = Date.now() - start
  const saved = await setCachedJson(fullKey, plain, ttlSeconds)

  logMiss({
    label,
    fullKey,
    durationMs,
    cached: saved,
    itemCount: countItems(plain),
    ttlSeconds
  })

  return plain
}

async function invalidateOrganizations () {
  const count = await deleteKey(KEYS.organizations())
  console.log(`${LOG_PREFIX} invalidate organizations (${count ? 1 : 0} key)`)
}

async function invalidateTypeProcesses () {
  const cacheKey = KEYS.typeProcesses()
  const deleted = await deleteKey(cacheKey)

  logInvalidate({
    module: 'TypeProcess',
    fullKey: `${API_CACHE_PREFIX}${cacheKey}`,
    deleted
  })
}

async function invalidateTypeDocs () {
  const count = await deleteKeysByPattern('typeDoc:*')
  console.log(`${LOG_PREFIX} invalidate type docs (${count} key(s))`)
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

async function invalidateWidgetListCache ({ module, cacheKey }) {
  const deleted = await deleteKey(cacheKey)

  logInvalidate({
    module,
    fullKey: `${API_CACHE_PREFIX}${cacheKey}`,
    deleted
  })
}

async function invalidateTextFields () {
  await invalidateWidgetListCache({
    module: 'TextField',
    cacheKey: KEYS.textFields()
  })
}

async function invalidateTextDropdowns () {
  await invalidateWidgetListCache({
    module: 'TextDropdown',
    cacheKey: KEYS.textDropdowns()
  })
}

async function invalidateRadioGroups () {
  await invalidateWidgetListCache({
    module: 'RadioGroup',
    cacheKey: KEYS.radioGroups()
  })
}

async function invalidateCheckLists () {
  await invalidateWidgetListCache({
    module: 'CheckList',
    cacheKey: KEYS.checkLists()
  })
}

async function invalidateDatePickers () {
  await invalidateWidgetListCache({
    module: 'DatePicker',
    cacheKey: KEYS.datePickers()
  })
}

async function invalidateFilePickers () {
  await invalidateWidgetListCache({
    module: 'FilePicker',
    cacheKey: KEYS.filePickers()
  })
}

async function invalidateAuthProcessesByType (typeTransId = null) {
  if (typeTransId != null) {
    const cacheKey = KEYS.authProcessesByType(typeTransId)
    const deleted = await deleteKey(cacheKey)

    logInvalidate({
      module: 'ProcessDefinition',
      fullKey: `${API_CACHE_PREFIX}${cacheKey}`,
      deleted
    })
    return
  }

  const count = await deleteKeysByPattern('process:auth:typed:*')
  console.log(
    `${LOG_PREFIX} invalidate all typed auth process lists (${count} key(s)) — redis: ${redisStatusLabel()}`
  )
}

async function invalidateAuthComplaintProcesses () {
  const cacheKey = KEYS.authComplaintProcesses()
  const deleted = await deleteKey(cacheKey)

  logInvalidate({
    module: 'Complaint',
    fullKey: `${API_CACHE_PREFIX}${cacheKey}`,
    deleted
  })
}

async function invalidateAllAuthProcessCaches () {
  const typedCount = await deleteKeysByPattern('process:auth:typed:*')
  const allKey = KEYS.authProcessesAll()
  const allDeleted = await deleteKey(allKey)
  const complaintKey = KEYS.authComplaintProcesses()
  const complaintDeleted = await deleteKey(complaintKey)

  console.log(
    `${LOG_PREFIX} invalidate all auth process caches — typed: ${typedCount} key(s), all: ${allDeleted} key(s), complaint: ${complaintDeleted} key(s) — redis: ${redisStatusLabel()}`
  )
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

async function invalidateEmployeeTasksForUser (userId) {
  if (userId == null) {
    return
  }

  const count = await deleteKeysByPattern(`employee-tasks:${userId}:*`)
  console.log(`${LOG_PREFIX} invalidate employee tasks for user ${userId} (${count} key(s))`)
}

async function invalidateEmployeeActiveTaskList (userId, filterScope = null) {
  if (userId == null) {
    return
  }

  if (filterScope) {
    const cacheKey = KEYS.employeeActiveTaskList(userId, filterScope)
    const deleted = await deleteKey(cacheKey)

    logInvalidate({
      module: `ActiveTaskList:${filterScope}`,
      fullKey: buildFullCacheKey(cacheKey),
      deleted
    })
    return
  }

  const count = await deleteKeysByPattern(`employee-tasks:${userId}:active-list:*`)

  logInvalidate({
    module: `ActiveTaskList:all:user${userId}`,
    fullKey: buildFullCacheKey(`employee-tasks:${userId}:active-list:*`),
    deleted: count
  })
}

async function invalidateEmployeeTasksByDepartment (departmentId) {
  if (departmentId == null) {
    return
  }

  const count = await deleteKeysByPattern('employee-tasks:*:depts:*')
  console.log(
    `${LOG_PREFIX} invalidate employee tasks for department ${departmentId} (${count} key(s))`
  )
}

async function invalidateEmployeeTaskStats () {
  const count = await deleteKeysByPattern('employee-task-stats:*')
  console.log(`${LOG_PREFIX} invalidate employee task stats (${count} key(s))`)
}

module.exports = {
  KEYS,
  buildFullCacheKey,
  deleteKey,
  deleteKeysByPattern,
  getCachedJson,
  setCachedJson,
  getOrLoad,
  logCacheHit: logHit,
  logCacheMiss: logMiss,
  logCacheInvalidate: logInvalidate,
  invalidateOrganizations,
  invalidateTypeProcesses,
  invalidateTypeDocs,
  invalidateDepartmentLeaves,
  invalidateRolesByDepartment,
  invalidateLocations,
  invalidateDocumentTemplates,
  invalidateTextFields,
  invalidateTextDropdowns,
  invalidateRadioGroups,
  invalidateCheckLists,
  invalidateDatePickers,
  invalidateFilePickers,
  invalidateAuthProcessesByType,
  invalidateAuthComplaintProcesses,
  invalidateAllAuthProcessCaches,
  invalidateStageConfig,
  invalidateTransactionDraft,
  invalidateTransactionById,
  invalidateUserTransactionDrafts,
  invalidateAllTransactionsForUser,
  invalidateEmployeeTasksForUser,
  invalidateEmployeeActiveTaskList,
  invalidateEmployeeTasksByDepartment,
  invalidateEmployeeTaskStats
}
