const Joi = require('joi')

const {
  toAuthProcessResponse
} = require('../mappers/processMapper')

const processRepository =
  require('../repositories/processRepository')

const authClient =
  require('../../../core/shared/clients/auth/authClient')

const orgDeptRolesClient =
  require('../../../core/shared/clients/organization/orgDeptRolesClient')

const {
  buildRoleKey,
  getOrLoadProcessList,
  getOrLoadCitizenOdrId
} = require('../../../core/cache/processCacheService')

const LOG_PREFIX = '[ComplaintService]'

const userIdSchema = Joi.number().integer().positive().required()

function validateUserId (userId) {
  const { error } = userIdSchema.validate(userId)

  if (error) {
    throw new Error('معرّف المستخدم غير صالح')
  }
}

/**
 * جلب عمليات الشكوى (is_complaint = true)
 * - لا تعتمد على type_trans_id
 * - تستخدم كاش Redis حسب أدوار المستخدم
 */
async function getAuthProcessesCompaint (userId) {
  console.log(`${LOG_PREFIX} getAuthProcessesCompaint userId=${userId}`)
  validateUserId(userId)

  const roleIds = await authClient.getUserRoles(userId)

  if (!roleIds || roleIds.length === 0) {
    console.log(`${LOG_PREFIX} لا صلاحيات للمستخدم ${userId}`)
    return {
      message: 'لا يوجد صلاحيات للمستخدم',
      data: [],
      from_cache: false
    }
  }

  // مفتاح الكاش: complaint + أدوار المستخدم
  const cacheKey = `complaint:roles:${buildRoleKey(roleIds)}`
  console.log(`${LOG_PREFIX} cacheKey=${cacheKey} roles=${roleIds.length}`)

  const result = await getOrLoadProcessList(
    cacheKey,
    async () => {
      const processes = await processRepository.findAuthComplaintProcesses(roleIds)

      return {
        message: ' تم جلب معاملات الشكاوي بنجاح',
        data: processes.map(toAuthProcessResponse)
      }
    },
    { label: 'employee complaints (is_complaint=true)' }
  )

  console.log(
    `${LOG_PREFIX} done — count=${result.data?.length ?? 0} source=${result.from_cache ? 'REDIS' : 'DATABASE'}`
  )

  return result
}

/**
 * resolve organization_department_roles.id لدور CITIZEN
 */
async function resolveCitizenOrgDeptRoleId () {
  return getOrLoadCitizenOdrId(() => orgDeptRolesClient.getCitizenRole())
}

/**
 * جلب شكاوى المواطن (is_complaint = true)
 * - مخصص لـ CITIZEN — لا يحتاج type_trans_id
 * - index: idx_process_citizen_complaint + idx_odr_citizen_lookup
 */
async function getCitizenComplaintProcesses () {
  console.log(`${LOG_PREFIX} getCitizenComplaintProcesses`)

  const citizenOdrId = await resolveCitizenOrgDeptRoleId()
  const cacheKey = `citizen:complaint:odr:${citizenOdrId}`

  const result = await getOrLoadProcessList(
    cacheKey,
    async () => {
      const processes = await processRepository.findCitizenComplaintProcesses(
        citizenOdrId
      )

      return {
        message: 'تم جلب عمليات AUTH بنجاح',
        data: processes.map(toAuthProcessResponse)
      }
    },
    { label: 'citizen complaints (CITIZEN, is_complaint=true)' }
  )

  console.log(
    `${LOG_PREFIX} done — count=${result.data?.length ?? 0} source=${result.from_cache ? 'REDIS' : 'DATABASE'}`
  )

  return result
}

module.exports = {
  getAuthProcessesCompaint,
  getCitizenComplaintProcesses
}
