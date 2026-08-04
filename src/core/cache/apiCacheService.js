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
  typeProcessesAll: () => 'typeProcess:all-active-and-inactive',
  typeDocs: () => 'typeDoc:all',
  typeDocById: (id) => `typeDoc:id:${id}`,
  departmentLeaves: (organizationId) => `department:leaves:${organizationId}`,
  rolesByDepartment: (departmentId) => `role:by-dept:${departmentId}`,
  stageAssignments: (stageId) => `stage-assignments:${stageId}`,
  locations: () => 'location:all',
  documentTemplates: () => 'document-templates:active',
  documentTemplateById: (id) => `document-templates:id:${id}`,
  departmentOverview: (departmentId) => `department:overview:${departmentId}`,
  employeesByDepartments: (userId, departmentIds, cursor, limit) => {
    const deptKey = [...departmentIds].sort((a, b) => a - b).join('-')
    const cursorKey = cursor ? encodeURIComponent(cursor) : 'start'
    return `employees:by-depts:${userId}:${deptKey}:c${cursorKey}:l${limit}`
  },
  employeesByOrgDeptRole: (orgDeptRoleId) => `employees:by-odr:${orgDeptRoleId}`,
  employeesByOrgRoleDept: (organizationId, roleId, departmentId) =>
    `employees:by-odr:org${organizationId}:role${roleId}:dept${departmentId}`,
  finalDocumentGenerateResponse: (transactionId) =>
    `final-document:generate:tx:${transactionId}`,
  textFields: () => 'text-fields:all',
  textDropdowns: () => 'text-dropdowns:all',
  radioGroups: () => 'radio-groups:all',
  checkLists: () => 'check-lists:all',
  datePickers: () => 'date-pickers:all',
  filePickers: () => 'file-pickers:all',
  authProcessesByType: (typeTransId) => `process:auth:typed:${typeTransId}`,
  authProcessesAll: () => 'process:auth:all',
  authComplaintProcesses: () => 'process:auth:complaint:all',
  // GET /process_definitions/type/:id — نشطة فقط
  processesByTypeActive: (typeTransId) => `process:by-type:active:${typeTransId}`,
  processesByTypeActiveAll: () => 'process:by-type:active:all',
  // GET /process_definitions/admin/type/:id — معتمدة فقط (أي is_active)
  adminProcessesByType: (typeTransId) => `process:admin:typed:approved:${typeTransId}`,
  adminProcessesAll: () => 'process:admin:all:approved',
  adminComplaintProcessesActive: () => 'process:admin:complaint:active',
  adminComplaintProcessesAllStatuses: () => 'process:admin:complaint:all-statuses',
  technicalOfficerUserIds: () => 'notification:technical-officer-user-ids',
  stageConfig: (processId) => `stage-config:process:${processId}`,
  complaintStageConfigActive: () => 'stage-config:complaint:active',
  currentStage: (processDefinitionId, taskDefinitionKey) =>
    `current-stage:${processDefinitionId}:${taskDefinitionKey}`,
  finalDocument: (transactionId) => `final-document:tx:${transactionId}`,
  documentVerifyDetailsCode: (pin) => `verify:details-code:${pin}`,
  taskDetails: (taskId, userId) => `task-details:${taskId}:user:${userId}`,
  transactionDraft: (userId, processId) => `transaction:draft:${userId}:${processId}`,
  createDraft: (userId, processId) => `transaction:create-draft:${userId}:${processId}`,
  transactionById: (userId, transactionId) => `transaction:by-id:${userId}:${transactionId}`,
  employeeTasks: (userId, scope, cursor, limit) => {
    const cursorKey = cursor ? encodeURIComponent(cursor) : 'start'
    return `employee-tasks:${userId}:${scope}:c${cursorKey}:l${limit}`
  },
  employeeTasksByDepartments: (userId, departmentIds, status, cursor, limit, fromDate, toDate) => {
    const deptKey = [...departmentIds].sort((a, b) => a - b).join('-')
    const fromKey = fromDate ? fromDate.toISOString().slice(0, 10) : 'all'
    const toKey = toDate ? toDate.toISOString().slice(0, 10) : 'all'
    const cursorKey = cursor ? encodeURIComponent(cursor) : 'start'
    return `employee-tasks:${userId}:depts:${deptKey}:${status}:from${fromKey}:to${toKey}:c${cursorKey}:l${limit}`
  },
  employeeTaskStats: (userId, scope, departmentIds, periodKey = 'default') => {
    const deptKey = [...departmentIds].sort((a, b) => a - b).join('-')
    return `employee-task-stats:${userId}:${scope}:depts:${deptKey}:${periodKey}`
  },
  processDefinitionDepartments: (processDefinitionId) =>
    `process:departments:${processDefinitionId}`,
  processDefinitionsWithType: () => 'process:definitions:with-type',
  processDefinitionDetails: (processId) => `process:details:${processId}`,
  userAccessibleDepartments: (userId) => `user:accessible-departments:${userId}`,
  // صلاحيات المستخدم كاملة — مفتاح واحد لكل user (أفضل من كاش لكل permission)
  userPermissions: (userId) => `auth:user-permissions:${userId}`,
  permissionsAll: () => 'auth:permissions:all',
  permissionsByAudience: (audience) => `auth:permissions:audience:${audience}`,
  rolePermissionsByOrgDeptRole: (orgDeptRoleId) =>
    `auth:role-permissions:odr:${orgDeptRoleId}`
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

function logHit ({ label, fullKey, itemCount }) {
  const itemsSuffix =
    itemCount != null ? ` — items: ${itemCount}` : ''

  console.log('⚡ data from Redis cache')
  console.log(
    `${LOG_PREFIX} CACHE HIT — source: REDIS — ${label} — key: ${fullKey}${itemsSuffix} — redis: ${redisStatusLabel()}`
  )
}

function logMiss ({ label, fullKey, durationMs, cached, itemCount }) {
  const itemsSuffix =
    itemCount != null ? ` — items: ${itemCount}` : ''

  console.log('🐢 data from DATABASE')
  console.log(
    `${LOG_PREFIX} CACHE MISS — source: DATABASE — ${label} — key: ${fullKey} — ${durationMs}ms${itemsSuffix}` +
    (cached
      ? ` — saved to Redis (TTL=${DEFAULT_TTL_SECONDS}s, redis=${redisStatusLabel()})`
      : ` — Redis unavailable, not cached (redis=${redisStatusLabel()})`)
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
  const fullKey = `${API_CACHE_PREFIX}${cacheKey}`
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
  const saved = await setCachedJson(fullKey, plain, options.ttlSeconds)

  logMiss({
    label,
    fullKey,
    durationMs,
    cached: saved,
    itemCount: countItems(plain)
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

  const allKey = KEYS.typeProcessesAll()
  const allDeleted = await deleteKey(allKey)

  logInvalidate({
    module: 'TypeProcess',
    fullKey: `${API_CACHE_PREFIX}${allKey}`,
    deleted: allDeleted
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

async function invalidateDocumentTemplates (templateId = null) {
  if (templateId != null) {
    await deleteKey(KEYS.documentTemplateById(templateId))
  }

  const count = await deleteKeysByPattern('document-templates:*')
  console.log(`${LOG_PREFIX} invalidate document templates (${count} key(s))`)
}

async function invalidateDepartmentOverview (departmentId = null) {
  if (departmentId != null) {
    await deleteKey(KEYS.departmentOverview(departmentId))
    console.log(`${LOG_PREFIX} invalidate department overview — dept ${departmentId}`)
    return
  }

  const count = await deleteKeysByPattern('department:overview:*')
  console.log(`${LOG_PREFIX} invalidate all department overviews (${count} key(s))`)
}

async function invalidateEmployeesByDepartments () {
  const count = await deleteKeysByPattern('employees:by-depts:*')
  console.log(`${LOG_PREFIX} invalidate employees by departments (${count} key(s))`)
  await invalidateEmployeesByOrgDeptRole()
}

async function invalidateEmployeesByOrgDeptRole (orgDeptRoleId = null) {
  if (orgDeptRoleId != null) {
    await deleteKey(KEYS.employeesByOrgDeptRole(orgDeptRoleId))
    console.log(
      `${LOG_PREFIX} invalidate employees by org-dept-role — odr ${orgDeptRoleId}`
    )
    return
  }

  const count = await deleteKeysByPattern('employees:by-odr:*')
  console.log(
    `${LOG_PREFIX} invalidate all employees by org-dept-role (${count} key(s))`
  )
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

async function invalidateComplaintStageConfig () {
  const cacheKey = KEYS.complaintStageConfigActive()
  const deleted = await deleteKey(cacheKey)

  logInvalidate({
    module: 'ComplaintStageConfig',
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

  const byTypeActiveCount = await deleteKeysByPattern('process:by-type:active:*')
  const byTypeActiveAllDeleted = await deleteKey(KEYS.processesByTypeActiveAll())
  const adminTypedCount = await deleteKeysByPattern('process:admin:typed:*')
  const adminAllDeleted = await deleteKey(KEYS.adminProcessesAll())
  // مفاتيح قديمة قبل الفصل (is_active فقط)
  await deleteKey('process:admin:all')
  const adminComplaintActiveDeleted = await deleteKey(KEYS.adminComplaintProcessesActive())
  const adminComplaintAllStatusesDeleted = await deleteKey(
    KEYS.adminComplaintProcessesAllStatuses()
  )
  await invalidateComplaintStageConfig()

  console.log(
    `${LOG_PREFIX} invalidate all auth process caches — typed: ${typedCount} key(s), all: ${allDeleted} key(s), complaint: ${complaintDeleted} key(s) — redis: ${redisStatusLabel()}`
  )
  console.log(
    `${LOG_PREFIX} invalidate process-by-type active caches — typed: ${byTypeActiveCount} key(s), all: ${byTypeActiveAllDeleted} key(s)`
  )
  console.log(
    `${LOG_PREFIX} invalidate all admin process caches — typed: ${adminTypedCount} key(s), all: ${adminAllDeleted} key(s), complaintActive: ${adminComplaintActiveDeleted} key(s), complaintAllStatuses: ${adminComplaintAllStatusesDeleted} key(s) — redis: ${redisStatusLabel()}`
  )
}

async function invalidateStageConfig (processId = null) {
  if (processId != null) {
    await deleteKey(KEYS.stageConfig(processId))
    // إعداد المرحلة تغيّر → أبطل أيضاً كاش المرحلة الحالية وتفاصيل العملية
    await deleteKeysByPattern(`current-stage:${processId}:*`)
    await deleteKeysByPattern('stage-assignments:*')
    await invalidateProcessDefinitionDetails(processId)
    await invalidateComplaintStageConfig()
    console.log(`${LOG_PREFIX} invalidate stage config — process ${processId}`)
    return
  }

  const count = await deleteKeysByPattern('stage-config:process:*')
  const stageCount = await deleteKeysByPattern('current-stage:*')
  const assignmentCount = await deleteKeysByPattern('stage-assignments:*')
  await invalidateComplaintStageConfig()
  console.log(
    `${LOG_PREFIX} invalidate all stage configs (${count} key(s)) + current stages (${stageCount} key(s)) + stage assignments (${assignmentCount} key(s))`
  )
}

async function invalidateStageAssignments (stageId = null) {
  if (stageId != null) {
    await deleteKey(KEYS.stageAssignments(stageId))
    await invalidateComplaintStageConfig()
    console.log(`${LOG_PREFIX} invalidate stage assignments — stage ${stageId}`)
    return
  }

  const count = await deleteKeysByPattern('stage-assignments:*')
  await invalidateComplaintStageConfig()
  console.log(`${LOG_PREFIX} invalidate all stage assignments (${count} key(s))`)
}

async function invalidateCurrentStage (processDefinitionId = null) {
  if (processDefinitionId != null) {
    const count = await deleteKeysByPattern(`current-stage:${processDefinitionId}:*`)
    console.log(
      `${LOG_PREFIX} invalidate current stage — process ${processDefinitionId} (${count} key(s))`
    )
    return
  }

  const count = await deleteKeysByPattern('current-stage:*')
  console.log(`${LOG_PREFIX} invalidate all current stages (${count} key(s))`)
}

async function invalidateFinalDocument (transactionId) {
  if (transactionId == null) {
    return
  }

  const cacheKey = KEYS.finalDocument(transactionId)
  const generateKey = KEYS.finalDocumentGenerateResponse(transactionId)
  const deleted = await deleteKey(cacheKey)
  const generateDeleted = await deleteKey(generateKey)

  logInvalidate({
    module: 'FinalDocument',
    fullKey: `${API_CACHE_PREFIX}${cacheKey}`,
    deleted
  })

  if (generateDeleted) {
    logInvalidate({
      module: 'FinalDocumentGenerate',
      fullKey: `${API_CACHE_PREFIX}${generateKey}`,
      deleted: generateDeleted
    })
  }
}

async function invalidateTaskDetails (taskId) {
  if (taskId == null) {
    return
  }

  const count = await deleteKeysByPattern(`task-details:${taskId}:*`)
  console.log(`${LOG_PREFIX} invalidate task details — task ${taskId} (${count} key(s))`)
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

async function invalidateProcessDefinitionDepartments (processDefinitionId = null) {
  if (processDefinitionId != null) {
    const count = await deleteKeysByPattern(`process:departments:${processDefinitionId}`)
    console.log(
      `${LOG_PREFIX} invalidate process departments — process ${processDefinitionId} (${count} key(s))`
    )
    return
  }

  const count = await deleteKeysByPattern('process:departments:*')
  console.log(`${LOG_PREFIX} invalidate all process departments (${count} key(s))`)
}

async function invalidateProcessDefinitionsWithType () {
  const count = await deleteKey(KEYS.processDefinitionsWithType())
  console.log(
    `${LOG_PREFIX} invalidate process definitions with type (${count ? 1 : 0} key)`
  )
}

async function invalidateProcessDefinitionDetails (processDefinitionId = null) {
  if (processDefinitionId != null) {
    const deleted = await deleteKey(
      KEYS.processDefinitionDetails(processDefinitionId)
    )
    logInvalidate({
      module: 'ProcessDefinitionDetails',
      fullKey: `${API_CACHE_PREFIX}${KEYS.processDefinitionDetails(processDefinitionId)}`,
      deleted
    })
    return
  }

  const count = await deleteKeysByPattern('process:details:*')
  console.log(
    `${LOG_PREFIX} invalidate all process definition details (${count} key(s)) — redis: ${redisStatusLabel()}`
  )
}

async function invalidateUserAccessibleDepartments (userId) {
  if (userId == null) {
    return
  }

  const cacheKey = KEYS.userAccessibleDepartments(userId)
  const deleted = await deleteKey(cacheKey)

  logInvalidate({
    module: 'UserAccessibleDepartments',
    fullKey: `${API_CACHE_PREFIX}${cacheKey}`,
    deleted
  })
}

async function invalidateAllUserAccessibleDepartments () {
  const count = await deleteKeysByPattern('user:accessible-departments:*')
  console.log(
    `${LOG_PREFIX} invalidate all user accessible departments (${count} key(s)) — redis: ${redisStatusLabel()}`
  )
}

async function invalidateUserPermissions (userId = null) {
  if (userId != null) {
    const deleted = await deleteKey(KEYS.userPermissions(userId))
    console.log(
      `${LOG_PREFIX} invalidate user permissions — user ${userId} (${deleted ? 1 : 0} key)`
    )
    return
  }

  const count = await deleteKeysByPattern('auth:user-permissions:*')
  console.log(
    `${LOG_PREFIX} invalidate all user permissions (${count} key(s)) — redis: ${redisStatusLabel()}`
  )
}

async function invalidateUserPermissionCaches () {
  return invalidateUserPermissions(null)
}

async function invalidatePermissionsAll () {
  const allDeleted = await deleteKey(KEYS.permissionsAll())
  const employeeDeleted = await deleteKey(KEYS.permissionsByAudience('employee'))
  const adminDeleted = await deleteKey(KEYS.permissionsByAudience('admin'))
  console.log(
    `${LOG_PREFIX} invalidate permissions — all: ${allDeleted ? 1 : 0}, employee: ${employeeDeleted ? 1 : 0}, admin: ${adminDeleted ? 1 : 0}`
  )
}

async function invalidateRolePermissionsByOrgDeptRole (orgDeptRoleId = null) {
  if (orgDeptRoleId != null) {
    const deleted = await deleteKey(KEYS.rolePermissionsByOrgDeptRole(orgDeptRoleId))
    console.log(
      `${LOG_PREFIX} invalidate role-permissions — odr ${orgDeptRoleId} (${deleted ? 1 : 0} key)`
    )
    return
  }

  const count = await deleteKeysByPattern('auth:role-permissions:odr:*')
  console.log(
    `${LOG_PREFIX} invalidate all role-permissions (${count} key(s)) — redis: ${redisStatusLabel()}`
  )
}

module.exports = {
  KEYS,
  deleteKeysByPattern,
  getCachedJson,
  setCachedJson,
  getOrLoad,
  invalidateOrganizations,
  invalidateTypeProcesses,
  invalidateTypeDocs,
  invalidateDepartmentLeaves,
  invalidateRolesByDepartment,
  invalidateLocations,
  invalidateDocumentTemplates,
  invalidateDepartmentOverview,
  invalidateEmployeesByDepartments,
  invalidateEmployeesByOrgDeptRole,
  invalidateTextFields,
  invalidateTextDropdowns,
  invalidateRadioGroups,
  invalidateCheckLists,
  invalidateDatePickers,
  invalidateFilePickers,
  invalidateAuthProcessesByType,
  invalidateAuthComplaintProcesses,
  invalidateComplaintStageConfig,
  invalidateAllAuthProcessCaches,
  invalidateStageConfig,
  invalidateStageAssignments,
  invalidateCurrentStage,
  invalidateFinalDocument,
  invalidateTaskDetails,
  invalidateTransactionDraft,
  invalidateTransactionById,
  invalidateUserTransactionDrafts,
  invalidateAllTransactionsForUser,
  invalidateEmployeeTasksForUser,
  invalidateEmployeeTasksByDepartment,
  invalidateEmployeeTaskStats,
  invalidateProcessDefinitionDepartments,
  invalidateProcessDefinitionsWithType,
  invalidateProcessDefinitionDetails,
  invalidateUserAccessibleDepartments,
  invalidateAllUserAccessibleDepartments,
  invalidateUserPermissions,
  invalidateUserPermissionCaches,
  invalidatePermissionsAll,
  invalidateRolePermissionsByOrgDeptRole
}
