const { Op } = require('sequelize')

const db = require('../../../../entities')

const LIST_INCLUDES = [
  {
    model: db.Stage,
    as: 'current_stage',
    attributes: ['id', 'name', 'code'],
    include: [
      {
        model: db.StageAssignment,
        as: 'stage_assignments',
        attributes: ['id', 'organization_department_roles_id'],
        separate: true,
        limit: 1,
        include: [
          {
            model: db.OrgDeptRole,
            as: 'organization_department_role',
            attributes: ['id'],
            include: [
              {
                model: db.Department,
                as: 'department',
                attributes: ['name']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    model: db.ProcessDefinition,
    as: 'process_definition',
    attributes: ['id', 'name', 'priority'],
    include: [
      {
        model: db.TypeTrans,
        as: 'type_trans',
        attributes: ['name', 'code']
      }
    ]
  },
  {
    model: db.Transaction,
    as: 'transaction',
    attributes: [
      'id',
      'id_process',
      'status',
      'first_name',
      'father_name',
      'last_name',
      'created_at'
    ],
    include: [
      {
        model: db.User,
        as: 'user',
        attributes: ['first_name', 'father_name', 'last_name', 'userName']
      }
    ]
  }
]

const MAX_RUNNING_FETCH = 120

const ACTIVE_EMPLOYEE_TRANSACTION_STATUSES = ['in_progress']

function buildRunningListIncludes () {
  return LIST_INCLUDES.map((include) => {
    if (include.as !== 'transaction') {
      return include
    }

    return {
      ...include,
      required: true,
      where: {
        status: {
          [Op.in]: ACTIVE_EMPLOYEE_TRANSACTION_STATUSES
        }
      }
    }
  })
}

async function getUserRoleIds (userId) {
  const roles = await db.UserRoleAssignment.findAll({
    where: {
      user_id: userId,
      is_active: true
    },
    attributes: ['organization_department_roles_id'],
    raw: true
  })

  return roles.map(role => role.organization_department_roles_id)
}

async function getAccessibleStageContext (roleIds) {
  const assignments = await db.StageAssignment.findAll({
    where: {
      organization_department_roles_id: {
        [Op.in]: roleIds
      }
    },
    attributes: ['stage_id'],
    raw: true
  })

  const stageIds = [...new Set(assignments.map(item => item.stage_id))]

  if (!stageIds.length) {
    return { stageIds: [], processDefinitionIds: [] }
  }

  const stages = await db.Stage.findAll({
    where: {
      id: {
        [Op.in]: stageIds
      }
    },
    attributes: ['process_definition_id'],
    raw: true
  })

  const processDefinitionIds = [
    ...new Set(stages.map(stage => stage.process_definition_id))
  ]

  return { stageIds, processDefinitionIds }
}

async function getUserIdsForStageIds (stageIds = []) {
  const normalizedStageIds = [...new Set(stageIds.filter(Boolean))]

  if (!normalizedStageIds.length) {
    return []
  }

  const assignments = await db.StageAssignment.findAll({
    where: {
      stage_id: {
        [Op.in]: normalizedStageIds
      }
    },
    attributes: ['organization_department_roles_id'],
    raw: true
  })

  const roleIds = [
    ...new Set(assignments.map(item => item.organization_department_roles_id))
  ]

  if (!roleIds.length) {
    return []
  }

  const userRoles = await db.UserRoleAssignment.findAll({
    where: {
      organization_department_roles_id: {
        [Op.in]: roleIds
      },
      is_active: true
    },
    attributes: ['user_id'],
    raw: true
  })

  return [...new Set(userRoles.map(item => item.user_id))]
}

async function getRunningInstancesForProcessDefinitions ({
  processDefinitionIds
}) {
  if (!processDefinitionIds.length) {
    return []
  }

  return db.ProcessInstance.findAll({
    where: {
      status: 'running',
      process_definition_id: {
        [Op.in]: processDefinitionIds
      }
    },
    attributes: [
      'id',
      'process_definition_id',
      'camunda_process_instance_id',
      'current_stage_id',
      'task_lock_user_id',
      'task_lock_task_id',
      'task_lock_expires_at',
      'created_at'
    ],
    include: buildRunningListIncludes(),
    order: [
      [
        { model: db.ProcessDefinition, as: 'process_definition' },
        'priority',
        'DESC'
      ],
      ['created_at', 'ASC']
    ],
    limit: MAX_RUNNING_FETCH
  })
}

async function getRunningInstancesForStages ({
  stageIds,
  processDefinitionIds
}) {
  if (!stageIds.length || !processDefinitionIds.length) {
    return []
  }

  return db.ProcessInstance.findAll({
    where: {
      status: 'running',
      current_stage_id: {
        [Op.in]: stageIds
      },
      process_definition_id: {
        [Op.in]: processDefinitionIds
      }
    },
    attributes: [
      'id',
      'process_definition_id',
      'camunda_process_instance_id',
      'current_stage_id',
      'task_lock_user_id',
      'task_lock_task_id',
      'task_lock_expires_at',
      'created_at'
    ],
    include: buildRunningListIncludes(),
    order: [
      [
        { model: db.ProcessDefinition, as: 'process_definition' },
        'priority',
        'DESC'
      ],
      ['created_at', 'ASC']
    ],
    limit: MAX_RUNNING_FETCH
  })
}

const TERMINAL_INCLUDES = [
  {
    model: db.Stage,
    as: 'current_stage',
    attributes: ['id', 'name', 'code'],
    required: false
  },
  {
    model: db.ProcessDefinition,
    as: 'process_definition',
    attributes: ['id', 'name', 'priority'],
    include: [
      {
        model: db.TypeTrans,
        as: 'type_trans',
        attributes: ['name', 'code']
      }
    ]
  },
  {
    model: db.Transaction,
    as: 'transaction',
    required: true,
    attributes: [
      'id',
      'id_process',
      'status',
      'first_name',
      'father_name',
      'last_name',
      'created_at'
    ],
    include: [
      {
        model: db.User,
        as: 'user',
        attributes: ['first_name', 'father_name', 'last_name', 'userName']
      }
    ]
  }
]

async function userHasDepartmentsAccess (userId, departmentIds = []) {
  if (!departmentIds.length) {
    return { allowed: false, accessibleIds: [], deniedIds: departmentIds }
  }

  const roleIds = await getUserRoleIds(userId)

  if (!roleIds.length) {
    return { allowed: false, accessibleIds: [], deniedIds: departmentIds }
  }

  const rows = await db.OrgDeptRole.findAll({
    where: {
      id: {
        [Op.in]: roleIds
      },
      department_id: {
        [Op.in]: departmentIds
      },
      is_active: true
    },
    attributes: ['department_id'],
    raw: true
  })

  const accessibleIds = [
    ...new Set(rows.map(row => Number(row.department_id)))
  ]

  const deniedIds = departmentIds.filter(
    id => !accessibleIds.includes(id)
  )

  if (deniedIds.length) {
    const mistakenOrgDeptRoles = await db.OrgDeptRole.count({
      where: {
        id: {
          [Op.in]: deniedIds
        }
      }
    })

    return {
      allowed: false,
      accessibleIds,
      deniedIds,
      hint:
        mistakenOrgDeptRoles > 0
          ? 'department_ids يجب أن يكون department_id من جدول departments — وليس organization_department_role id'
          : null
    }
  }

  return {
    allowed: true,
    accessibleIds,
    deniedIds: []
  }
}

async function getStageCodesByDepartmentIds (departmentIds = []) {
  if (!departmentIds.length) {
    return []
  }

  const assignments = await db.StageAssignment.findAll({
    attributes: ['stage_id'],
    include: [
      {
        model: db.OrgDeptRole,
        as: 'organization_department_role',
        attributes: [],
        where: {
          department_id: {
            [Op.in]: departmentIds
          },
          is_active: true
        },
        required: true
      },
      {
        model: db.Stage,
        as: 'stage',
        attributes: ['code'],
        required: true
      }
    ]
  })

  return [
    ...new Set(
      assignments
        .map(item => item.stage?.code)
        .filter(Boolean)
    )
  ]
}

async function getTransactionIdsPassedDepartments (departmentIds = []) {
  const stageCodes = await getStageCodesByDepartmentIds(departmentIds)

  if (!stageCodes.length) {
    return []
  }

  const rows = await db.ProcessInstanceStage.findAll({
    attributes: ['transaction_id'],
    where: {
      stage_code: {
        [Op.in]: stageCodes
      },
      status: {
        [Op.in]: ['completed', 'rejected', 'in_progress']
      }
    },
    group: ['transaction_id'],
    raw: true
  })

  return rows.map(row => Number(row.transaction_id))
}

async function getLatestStageNamesByTransactionIds (transactionIds = []) {
  if (!transactionIds.length) {
    return new Map()
  }

  const rows = await db.ProcessInstanceStage.findAll({
    where: {
      transaction_id: {
        [Op.in]: transactionIds
      }
    },
    attributes: ['transaction_id', 'stage_name', 'updated_at'],
    order: [
      ['transaction_id', 'ASC'],
      ['updated_at', 'DESC']
    ],
    raw: true
  })

  const stageNameMap = new Map()

  for (const row of rows) {
    const transactionId = Number(row.transaction_id)

    if (!stageNameMap.has(transactionId)) {
      stageNameMap.set(transactionId, row.stage_name)
    }
  }

  return stageNameMap
}

async function countTerminalTransactionsByDepartments ({
  departmentIds,
  transactionStatus,
  fromDate = null,
  toDate = null
}) {
  const transactionIds = await getTransactionIdsPassedDepartments(departmentIds)

  if (!transactionIds.length) {
    return 0
  }

  const where = {
    id: {
      [Op.in]: transactionIds
    },
    status: transactionStatus
  }

  if (fromDate || toDate) {
    where.created_at = {}

    if (fromDate) {
      where.created_at[Op.gte] = fromDate
    }

    if (toDate) {
      where.created_at[Op.lte] = toDate
    }
  }

  return db.Transaction.count({ where })
}

async function getStageIdsByDepartmentIds (departmentIds = []) {
  if (!departmentIds.length) {
    return []
  }

  const assignments = await db.StageAssignment.findAll({
    attributes: ['stage_id'],
    include: [
      {
        model: db.OrgDeptRole,
        as: 'organization_department_role',
        attributes: [],
        where: {
          department_id: {
            [Op.in]: departmentIds
          },
          is_active: true
        },
        required: true
      }
    ]
  })

  return [
    ...new Set(
      assignments
        .map(item => Number(item.stage_id))
        .filter(id => Number.isInteger(id) && id > 0)
    )
  ]
}

async function getRunningInstancesForDepartmentTransactions ({
  departmentIds
}) {
  const stageIds = await getStageIdsByDepartmentIds(departmentIds)

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
      'camunda_process_instance_id',
      'task_lock_user_id',
      'task_lock_task_id',
      'task_lock_expires_at'
    ],
    include: [
      {
        model: db.Transaction,
        as: 'transaction',
        required: true,
        where: {
          status: {
            [Op.in]: ['submitted', 'in_progress']
          }
        },
        attributes: ['id', 'status']
      }
    ]
  })
}

async function getTerminalInstancesForStages ({
  processDefinitionIds,
  transactionStatus,
  limit,
  offset
}) {
  if (!processDefinitionIds.length) {
    return { rows: [], count: 0 }
  }

  return db.ProcessInstance.findAndCountAll({
    where: {
      status: 'completed',
      process_definition_id: {
        [Op.in]: processDefinitionIds
      }
    },
    attributes: ['id', 'process_definition_id', 'current_stage_id', 'created_at', 'updated_at'],
    include: [
      TERMINAL_INCLUDES[0],
      TERMINAL_INCLUDES[1],
      {
        ...TERMINAL_INCLUDES[2],
        where: {
          status: transactionStatus
        }
      }
    ],
    order: [
      [{ model: db.ProcessDefinition, as: 'process_definition' }, 'priority', 'DESC'],
      [{ model: db.Transaction, as: 'transaction' }, 'created_at', 'ASC']
    ],
    limit,
    offset,
    distinct: true
  })
}

async function getTerminalInstancesByDepartments ({
  departmentIds,
  transactionStatus,
  fromDate = null,
  toDate = null,
  limit,
  offset
}) {
  const transactionIds = await getTransactionIdsPassedDepartments(departmentIds)

  if (!transactionIds.length) {
    return { rows: [], count: 0 }
  }

  const transactionWhere = {
    status: transactionStatus
  }

  if (fromDate || toDate) {
    transactionWhere.created_at = {}

    if (fromDate) {
      transactionWhere.created_at[Op.gte] = fromDate
    }

    if (toDate) {
      transactionWhere.created_at[Op.lte] = toDate
    }
  }

  return db.ProcessInstance.findAndCountAll({
    where: {
      status: 'completed',
      transaction_id: {
        [Op.in]: transactionIds
      }
    },
    attributes: ['id', 'process_definition_id', 'current_stage_id', 'created_at', 'updated_at'],
    include: [
      TERMINAL_INCLUDES[0],
      TERMINAL_INCLUDES[1],
      {
        ...TERMINAL_INCLUDES[2],
        where: transactionWhere
      }
    ],
    order: [
      [{ model: db.ProcessDefinition, as: 'process_definition' }, 'priority', 'DESC'],
      [{ model: db.Transaction, as: 'transaction' }, 'created_at', 'ASC']
    ],
    limit,
    offset,
    distinct: true
  })
}

async function countStagesByProcessDefinitionIds (processDefinitionIds = []) {
  if (!processDefinitionIds.length) {
    return new Map()
  }

  const rows = await db.Stage.findAll({
    where: {
      process_definition_id: {
        [Op.in]: processDefinitionIds
      }
    },
    attributes: [
      'process_definition_id',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total']
    ],
    group: ['process_definition_id'],
    raw: true
  })

  return new Map(
    rows.map(row => [Number(row.process_definition_id), Number(row.total)])
  )
}

async function countCompletedStagesByTransactionIds (transactionIds = []) {
  if (!transactionIds.length) {
    return new Map()
  }

  const rows = await db.ProcessInstanceStage.findAll({
    where: {
      transaction_id: {
        [Op.in]: transactionIds
      },
      status: 'completed'
    },
    attributes: [
      'transaction_id',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total']
    ],
    group: ['transaction_id'],
    raw: true
  })

  return new Map(
    rows.map(row => [Number(row.transaction_id), Number(row.total)])
  )
}

async function getCompletedStageCodesByTransactionIds (transactionIds = []) {
  if (!transactionIds.length) {
    return new Map()
  }

  const rows = await db.ProcessInstanceStage.findAll({
    where: {
      transaction_id: {
        [Op.in]: transactionIds
      },
      status: 'completed'
    },
    attributes: ['transaction_id', 'stage_code'],
    raw: true
  })

  const map = new Map()

  for (const row of rows) {
    const transactionId = Number(row.transaction_id)

    if (!map.has(transactionId)) {
      map.set(transactionId, new Set())
    }

    map.get(transactionId).add(String(row.stage_code))
  }

  return map
}

module.exports = {
  getUserRoleIds,
  getAccessibleStageContext,
  getUserIdsForStageIds,
  getRunningInstancesForProcessDefinitions,
  getRunningInstancesForStages,
  getTerminalInstancesForStages,
  getTerminalInstancesByDepartments,
  countTerminalTransactionsByDepartments,
  getRunningInstancesForDepartmentTransactions,
  getLatestStageNamesByTransactionIds,
  userHasDepartmentsAccess,
  countStagesByProcessDefinitionIds,
  countCompletedStagesByTransactionIds,
  getCompletedStageCodesByTransactionIds,
  MAX_RUNNING_FETCH
}
