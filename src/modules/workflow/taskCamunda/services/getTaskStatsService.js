'use strict'

const employeeTaskRepository = require('../repositories/employeeTaskRepository')
const camundaClient = require('../../../../core/shared/clients/camunda/camundaClient')
const { retryWithBackoff } = require('../../../../core/utils/retryWithBackoff')
const {
  KEYS,
  getOrLoad
} = require('../../../../core/cache/apiCacheService')
const { EMPLOYEE_TASKS_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const { resolveEmployeeTaskStatus } = require('../utils/employeeTaskStatus')
const {
  parseDepartmentIds,
  parseDateRange
} = require('./getAllTasksService')

function formatDateOnly (date) {
  return date.toISOString().slice(0, 10)
}

function buildLastMonthPeriod () {
  const toDate = new Date()
  toDate.setHours(23, 59, 59, 999)

  const fromDate = new Date(toDate)
  fromDate.setDate(fromDate.getDate() - 29)
  fromDate.setHours(0, 0, 0, 0)

  return { fromDate, toDate }
}

async function assertDepartmentsAccess (userId, departmentIds) {
  const access = await employeeTaskRepository.userHasDepartmentsAccess(
    userId,
    departmentIds
  )

  if (!access.allowed) {
    const hint = access.hint ? ` — ${access.hint}` : ''
    const error = new Error(
      `لا تملك صلاحية الوصول للدوائر: ${access.deniedIds.join(', ')}${hint}`
    )
    error.code = 'FORBIDDEN'
    throw error
  }
}

async function fetchActiveCamundaTasks (camundaIds) {
  return retryWithBackoff(
    () => camundaClient.getActiveTasksByProcessInstanceIds(camundaIds),
    { label: 'Camunda.getActiveTasksByProcessInstanceIds' }
  )
}

async function countTerminalForDepartments ({
  userId,
  departmentIds,
  transactionStatus,
  fromDate,
  toDate
}) {
  await assertDepartmentsAccess(userId, departmentIds)

  const count =
    await employeeTaskRepository.countTerminalTransactionsByDepartments({
      departmentIds,
      transactionStatus,
      fromDate,
      toDate
    })

  return {
    count,
    department_ids: departmentIds,
    period: {
      from_date: formatDateOnly(fromDate),
      to_date: formatDateOnly(toDate),
      label: 'last_month'
    }
  }
}

async function countActiveForDepartments ({ userId, departmentIds }) {
  await assertDepartmentsAccess(userId, departmentIds)

  const instances =
    await employeeTaskRepository.getRunningInstancesForDepartmentTransactions({
      departmentIds
    })

  if (!instances.length) {
    return {
      count: 0,
      in_progress_count: 0,
      pending_pickup_count: 0,
      department_ids: departmentIds
    }
  }

  const camundaIds = instances.map(
    instance => instance.camunda_process_instance_id
  )

  const taskMap = await fetchActiveCamundaTasks(camundaIds)

  let inProgressCount = 0
  let pendingPickupCount = 0

  for (const instance of instances) {
    const activeTasks = taskMap.get(instance.camunda_process_instance_id) || []

    for (const activeTask of activeTasks) {
      const employeeStatus = resolveEmployeeTaskStatus({
        transaction: instance.transaction,
        processInstance: instance,
        activeTask,
        userId
      })

      if (employeeStatus.status === 'in_progress') {
        inProgressCount += 1
      } else if (employeeStatus.status === 'pending_pickup') {
        pendingPickupCount += 1
      }
    }
  }

  return {
    count: inProgressCount + pendingPickupCount,
    in_progress_count: inProgressCount,
    pending_pickup_count: pendingPickupCount,
    department_ids: departmentIds
  }
}

async function loadCachedStats ({
  userId,
  scope,
  departmentIds,
  periodKey,
  loader
}) {
  const cacheKey = KEYS.employeeTaskStats(
    userId,
    scope,
    departmentIds,
    periodKey
  )

  return getOrLoad(cacheKey, loader, {
    label: `employee-task-stats:${scope}`,
    ttlSeconds: EMPLOYEE_TASKS_CACHE_TTL_SECONDS
  })
}

async function getCompletedLastMonthStats ({ userId, departmentIds }) {
  const { fromDate, toDate } = buildLastMonthPeriod()
  const periodKey = `last-month:${formatDateOnly(fromDate)}:${formatDateOnly(toDate)}`

  const data = await loadCachedStats({
    userId,
    scope: 'completed-last-month',
    departmentIds,
    periodKey,
    loader: () =>
      countTerminalForDepartments({
        userId,
        departmentIds,
        transactionStatus: 'completed',
        fromDate,
        toDate
      })
  })

  return {
    message: 'تم جلب عدد المعاملات المنجزة لآخر شهر بنجاح',
    data
  }
}

async function getRejectedLastMonthStats ({ userId, departmentIds }) {
  const { fromDate, toDate } = buildLastMonthPeriod()
  const periodKey = `last-month:${formatDateOnly(fromDate)}:${formatDateOnly(toDate)}`

  const data = await loadCachedStats({
    userId,
    scope: 'rejected-last-month',
    departmentIds,
    periodKey,
    loader: () =>
      countTerminalForDepartments({
        userId,
        departmentIds,
        transactionStatus: 'rejected',
        fromDate,
        toDate
      })
  })

  return {
    message: 'تم جلب عدد المعاملات المرفوضة لآخر شهر بنجاح',
    data
  }
}

async function getActiveStats ({ userId, departmentIds }) {
  const data = await loadCachedStats({
    userId,
    scope: 'active',
    departmentIds,
    periodKey: 'current',
    loader: () =>
      countActiveForDepartments({
        userId,
        departmentIds
      })
  })

  return {
    message: 'تم جلب عدد المعاملات النشطة بنجاح',
    data
  }
}

module.exports = {
  parseDepartmentIds,
  parseDateRange,
  getCompletedLastMonthStats,
  getRejectedLastMonthStats,
  getActiveStats
}
