'use strict'

const { toDTOList } = require('../mappers/complaintMapper')
const complaintRepository = require('../repositories/complaintRepository')
const { validateComplaintUserId } = require('../validations/complaintValidations')
const {
  filterAuthProcessesByRoleIds
} = require('../../processDefinition/utils/processAuthFilter')

const typeTransRepository =
  require('../../typeProcess/repositories/typeTransRepository')

const authClient =
  require('../../../../core/shared/clients/auth/authClient')

const {
  getOrLoad,
  KEYS
} = require('../../../../core/cache/apiCacheService')

const { PROCESS_CACHE_TTL_SECONDS } = require('../../../../core/config/env')

const LOG_PREFIX = '[Complaint]'

async function loadComplaintAuthProcessesFromDb () {
  const typeTrans =
    await typeTransRepository.findOneWhereComplaint()

  if (!typeTrans) {
    return []
  }

  return complaintRepository.findAuthComplaintProcessesForCache(typeTrans.id)
}

async function getAuthProcessesCompaint (userId) {
  validateComplaintUserId(userId)

  const typeTrans =
    await typeTransRepository.findOneWhereComplaint()

  if (!typeTrans) {
    throw new Error('لا يوجد هذا النوع')
  }

  const roleIds =
    await authClient.getUserRoles(userId)

  if (!roleIds || roleIds.length === 0) {
    return {
      message: 'لا يوجد صلاحيات للمستخدم',
      data: []
    }
  }

  const cacheKey = KEYS.authComplaintProcesses()

  console.log(
    `${LOG_PREFIX} GET /api/complaint/complaints — cache key: api:${cacheKey}`
  )

  const cachedProcesses = await getOrLoad(
    cacheKey,
    loadComplaintAuthProcessesFromDb,
    {
      label: 'Complaint GET /api/complaint/complaints',
      ttlSeconds: PROCESS_CACHE_TTL_SECONDS
    }
  )

  const processes = filterAuthProcessesByRoleIds(cachedProcesses, roleIds)
  const result = toDTOList(processes)

  return {
    message: 'تم جلب معاملات الشكوى بنجاح',
    data: result
  }
}

module.exports = {
  getAuthProcessesCompaint
}
