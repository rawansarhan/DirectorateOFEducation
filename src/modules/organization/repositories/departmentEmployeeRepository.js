'use strict'

const { Op } = require('sequelize')
const db = require('../../../entities')
const { isLockExpired } = require('../../workflow/taskCamunda/utils/employeeTaskStatus')

const ASSIGNMENT_INCLUDES = [
  {
    model: db.User,
    as: 'user',
    required: true,
    attributes: [
      'id',
      'first_name',
      'last_name',
      'father_name',
      'mother_name',
      'national_id',
      'is_active'
    ],
    where: { is_active: true }
  },
  {
    model: db.OrgDeptRole,
    as: 'org_department_role',
    required: true,
    where: {
      is_active: true,
      camunda_group_key: { [Op.ne]: 'CITIZEN' }
    },
    include: [
      {
        model: db.Department,
        as: 'department',
        attributes: ['id', 'name']
      },
      {
        model: db.Role,
        as: 'role',
        attributes: ['id', 'name', 'code']
      }
    ]
  }
]

async function findAssignmentsByDepartments ({
  departmentIds,
  cursor = null,
  limit
}) {
  const baseWhere = {
    is_active: true,
    '$org_department_role.department_id$': {
      [Op.in]: departmentIds
    }
  }

  const where = cursor
    ? {
        [Op.and]: [
          baseWhere,
          { id: { [Op.gt]: cursor.id } }
        ]
      }
    : baseWhere

  const rows = await db.UserRoleAssignment.findAll({
    where,
    attributes: ['id', 'user_id', 'organization_department_roles_id'],
    include: ASSIGNMENT_INCLUDES,
    order: [['id', 'ASC']],
    limit: limit + 1,
    subQuery: false
  })

  const hasNext = rows.length > limit
  const pageRows = hasNext ? rows.slice(0, limit) : rows

  return { rows: pageRows, hasNext }
}

async function getStageIdsByOrgDeptRoleIds (orgDeptRoleIds = []) {
  if (!orgDeptRoleIds.length) {
    return new Map()
  }

  const rows = await db.StageAssignment.findAll({
    where: {
      organization_department_roles_id: {
        [Op.in]: orgDeptRoleIds
      }
    },
    attributes: ['stage_id', 'organization_department_roles_id'],
    raw: true
  })

  const map = new Map()

  for (const row of rows) {
    const odrId = row.organization_department_roles_id
    const list = map.get(odrId) || []
    list.push(row.stage_id)
    map.set(odrId, list)
  }

  return map
}

async function countCompletedStagesByUsersAndOdrs ({
  userIds = [],
  orgDeptRoleIds = []
}) {
  if (!userIds.length || !orgDeptRoleIds.length) {
    return new Map()
  }

  const rows = await db.sequelize.query(
    `
      SELECT
        pis.assigned_to AS user_id,
        sa.organization_department_roles_id AS org_dept_role_id,
        COUNT(*)::int AS completed_count
      FROM process_instance_stage pis
      INNER JOIN stages s ON s.code = pis.stage_code
      INNER JOIN stage_assignments sa ON sa.stage_id = s.id
      WHERE pis.status = 'completed'
        AND pis.assigned_to IN (:userIds)
        AND sa.organization_department_roles_id IN (:orgDeptRoleIds)
      GROUP BY pis.assigned_to, sa.organization_department_roles_id
    `,
    {
      replacements: { userIds, orgDeptRoleIds },
      type: db.sequelize.QueryTypes.SELECT
    }
  )

  const map = new Map()

  for (const row of rows) {
    map.set(`${row.org_dept_role_id}:${row.user_id}`, Number(row.completed_count))
  }

  return map
}

async function getRunningInstancesForStageIds (stageIds = []) {
  if (!stageIds.length) {
    return []
  }

  return db.ProcessInstance.findAll({
    where: {
      status: 'running',
      current_stage_id: {
        [Op.in]: stageIds
      }
    },
    attributes: [
      'id',
      'current_stage_id',
      'task_lock_user_id',
      'task_lock_expires_at'
    ],
    include: [
      {
        model: db.Transaction,
        as: 'transaction',
        required: true,
        attributes: ['id'],
        where: {
          status: 'in_progress'
        }
      }
    ]
  })
}

function buildStageToOdrMap (stageIdsByOdr = new Map()) {
  const stageToOdrs = new Map()

  for (const [odrId, stageIds] of stageIdsByOdr.entries()) {
    for (const stageId of stageIds) {
      const list = stageToOdrs.get(stageId) || []
      list.push(odrId)
      stageToOdrs.set(stageId, list)
    }
  }

  return stageToOdrs
}

function aggregateActiveTasks ({
  instances = [],
  stageToOdrs = new Map(),
  now = new Date()
}) {
  const inProgressByOdrUser = new Map()
  const pendingByOdr = new Map()

  for (const instance of instances) {
    const stageId = instance.current_stage_id
    const odrIds = stageToOdrs.get(stageId) || []

    if (!odrIds.length) {
      continue
    }

    const lockUserId = instance.task_lock_user_id
    const hasValidLock =
      lockUserId &&
      !isLockExpired(instance, now)

    for (const odrId of odrIds) {
      if (hasValidLock) {
        const key = `${odrId}:${lockUserId}`
        inProgressByOdrUser.set(key, (inProgressByOdrUser.get(key) || 0) + 1)
      } else {
        pendingByOdr.set(odrId, (pendingByOdr.get(odrId) || 0) + 1)
      }
    }
  }

  return { inProgressByOdrUser, pendingByOdr }
}

function countEmployeesPerOdr (assignments = []) {
  const map = new Map()

  for (const assignment of assignments) {
    const odrId = assignment.organization_department_roles_id
    map.set(odrId, (map.get(odrId) || 0) + 1)
  }

  return map
}

async function countEmployeesByOrgDeptRoleIds (orgDeptRoleIds = []) {
  if (!orgDeptRoleIds.length) {
    return new Map()
  }

  const rows = await db.UserRoleAssignment.findAll({
    where: {
      is_active: true,
      organization_department_roles_id: {
        [Op.in]: orgDeptRoleIds
      }
    },
    attributes: [
      'organization_department_roles_id',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'employee_count']
    ],
    group: ['organization_department_roles_id'],
    raw: true
  })

  return new Map(
    rows.map(row => [
      row.organization_department_roles_id,
      Number(row.employee_count) || 0
    ])
  )
}

module.exports = {
  findAssignmentsByDepartments,
  getStageIdsByOrgDeptRoleIds,
  countCompletedStagesByUsersAndOdrs,
  getRunningInstancesForStageIds,
  buildStageToOdrMap,
  aggregateActiveTasks,
  countEmployeesPerOdr,
  countEmployeesByOrgDeptRoleIds
}
