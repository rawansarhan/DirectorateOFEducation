'use strict'

const { toDTOList } = require('../mappers/complaintMapper')
const complaintRepository = require('../repositories/complaintRepository')
const { validateComplaintUserId } = require('../validations/complaintValidations')
const {
  filterAuthProcessesByRoleIds
} = require('../../processDefinition/utils/processAuthFilter')

const { getUserRoles } = require('../../../auth/public')

const {
  getOrLoad,
  KEYS
} = require('../../../../core/cache/apiCacheService')

const { PROCESS_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const {
  paginateArray,
  emptyPaginatedResult
} = require('../../../../core/utils/pagination')

const LOG_PREFIX = '[Complaint]'

function sortAuthProcessesByPriority (processes = []) {
  return [...processes].sort((a, b) => Number(b.priority) - Number(a.priority))
}

async function loadComplaintAuthProcessesFromDb () {
  return complaintRepository.findAuthComplaintProcessesForCache()
}

async function getAuthProcessesCompaint (userId, paginationInput) {
  validateComplaintUserId(userId)

  const roleIds =
    await getUserRoles(userId)

  if (!roleIds || roleIds.length === 0) {
    return {
      message: 'لا يوجد صلاحيات للمستخدم',
      data: emptyPaginatedResult(paginationInput)
    }
  }

  const cacheKey = KEYS.authComplaintProcesses()

  console.log(
    `${LOG_PREFIX} GET /api/complaint/complaints — cache key: api:${cacheKey} (is_complaint=true)`
  )

  const cachedProcesses = await getOrLoad(
    cacheKey,
    loadComplaintAuthProcessesFromDb,
    {
      label: 'Complaint GET /api/complaint/complaints',
      ttlSeconds: PROCESS_CACHE_TTL_SECONDS
    }
  )

  const processes = sortAuthProcessesByPriority(
    filterAuthProcessesByRoleIds(cachedProcesses, roleIds)
  )
  const result = toDTOList(processes)
  const { items, pagination } = paginateArray(result, paginationInput)

  return {
    message: 'تم جلب معاملات الشكوى بنجاح',
    data: {
      items,
      pagination
    }
  }
}

module.exports = {
  getAuthProcessesCompaint
}
