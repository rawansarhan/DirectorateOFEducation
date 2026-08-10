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
    attributes: ['id', 'name', 'priority', 'type_trans_id'],
    include: [
      {
        model: db.TypeTrans,
        as: 'type_trans',
        attributes: ['id', 'name', 'code']
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
      'created_at',
      'data'
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

async function getUserIdsForOrgDeptRoleIds (orgDeptRoleIds = []) {
  const roleIds = [
    ...new Set(
      orgDeptRoleIds
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0)
    )
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

async function getRunningInstancesForAssigneeRoute (roleIds = []) {
  const normalizedRoleIds = [
    ...new Set(
      roleIds.map(Number).filter(id => Number.isInteger(id) && id > 0)
    )
  ]

  if (!normalizedRoleIds.length) {
    return []
  }

  const includes = buildRunningListIncludes().map(include => {
    if (include.as !== 'transaction') {
      return include
    }

    // transactions.data = JSON (ليس JSONB) — Op.contains يولّد @> ويحتاج jsonb على الطرفين
    return {
      ...include,
      where: {
        [Op.and]: [
          include.where || {},
          db.sequelize.where(
            db.sequelize.cast(
              db.sequelize.col('transaction.data'),
              'jsonb'
            ),
            '@>',
            db.sequelize.literal(`'{"__assignee_route":{}}'::jsonb`)
          )
        ]
      }
    }
  })

  const instances = await db.ProcessInstance.findAll({
    where: {
      status: 'running'
    },
    attributes: [
      'id',
      'process_definition_id',
      'camunda_process_instance_id',
      'current_stage_id',
      'task_lock_user_id',
      'task_lock_task_id',
      'task_lock_expires_at',
      'task_locks',
      'created_at'
    ],
    include: includes,
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

  return instances.filter(instance => {
    const routeIds =
      instance.transaction?.data?.__assignee_route
        ?.organization_department_roles_ids || []

    return routeIds.some(id => normalizedRoleIds.includes(Number(id)))
  })
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
      'task_locks',
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
    attributes: ['id', 'name', 'priority', 'type_trans_id'],
    include: [
      {
        model: db.TypeTrans,
        as: 'type_trans',
        attributes: ['id', 'name', 'code']
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
      'task_lock_expires_at',
      'task_locks'
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

const USER_STAGE_INCLUDES = [
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
      },
      {
        model: db.ProcessInstance,
        as: 'process_instance',
        required: false,
        attributes: ['id', 'process_definition_id', 'status'],
        include: [
          {
            model: db.ProcessDefinition,
            as: 'process_definition',
            attributes: ['id', 'name', 'priority', 'type_trans_id'],
            include: [
              {
                model: db.TypeTrans,
                as: 'type_trans',
                attributes: ['id', 'name', 'code']
              }
            ]
          }
        ]
      }
    ]
  }
]

async function getStagesCompletedByUser ({
  userId,
  status,
  limit,
  cursor = null,
  searchFilters = null,
  fromDate = null,
  toDate = null
}) {
  const {
    buildTransactionFieldWhere,
    buildProcessDefinitionWhere,
    buildApplicantNameOrConditions,
    likeContains,
    normalizeTypeDocIds
  } = require('../utils/taskSearchFilters')

  const baseWhere = {
    assigned_to: userId,
    status
  }

  const whereConditions = [baseWhere]
  const filters = searchFilters || {}

  const typeDocIds = normalizeTypeDocIds(filters)
  if (typeDocIds.length) {
    const withDocs = await getTransactionIdsHavingTypeDocs(typeDocIds)
    if (!withDocs.length) {
      return { rows: [], hasNext: false }
    }
    whereConditions.push({
      transaction_id: { [Op.in]: withDocs }
    })
  }

  if (cursor) {
    const createdAt = new Date(cursor.t)

    whereConditions.push({
      [Op.or]: [
        { created_at: { [Op.lt]: createdAt } },
        {
          [Op.and]: [
            { created_at: createdAt },
            { id: { [Op.lt]: cursor.id } }
          ]
        }
      ]
    })
  }

  const fieldAnd = buildTransactionFieldWhere({ ...filters, q: null })
  const transactionWhereParts = [...fieldAnd]

  if (fromDate || toDate || filters.from_date || filters.to_date) {
    const created = {}
    const from = fromDate || (filters.from_date
      ? new Date(`${filters.from_date}T00:00:00.000`)
      : null)
    const to = toDate || (filters.to_date
      ? new Date(`${filters.to_date}T23:59:59.999`)
      : null)
    if (from) created[Op.gte] = from
    if (to) created[Op.lte] = to
    if (Object.keys(created).length) {
      transactionWhereParts.push({ created_at: created })
    }
  }

  const transactionWhere = transactionWhereParts.length
    ? { [Op.and]: transactionWhereParts }
    : undefined

  if (filters.q) {
    const applicantOr = buildApplicantNameOrConditions(filters.q).map(cond => {
      if (cond[Op.and]) {
        return {
          [Op.and]: cond[Op.and].map(inner => {
            const out = {}
            for (const [k, v] of Object.entries(inner)) {
              out[`$transaction.${k}$`] = v
            }
            return out
          })
        }
      }
      const out = {}
      for (const [k, v] of Object.entries(cond)) {
        out[`$transaction.${k}$`] = v
      }
      return out
    })

    whereConditions.push({
      [Op.or]: [
        ...applicantOr,
        { '$transaction.process_instance.process_definition.name$': likeContains(filters.q) }
      ]
    })
  }

  const processWhere = buildProcessDefinitionWhere(filters)

  const includes = [
    {
      ...USER_STAGE_INCLUDES[0],
      where: transactionWhere,
      include: [
        USER_STAGE_INCLUDES[0].include[0],
        {
          ...USER_STAGE_INCLUDES[0].include[1],
          include: [
            {
              ...USER_STAGE_INCLUDES[0].include[1].include[0],
              attributes: [
                ...(USER_STAGE_INCLUDES[0].include[1].include[0].attributes || [
                  'id',
                  'name',
                  'priority'
                ]),
                'type_trans_id'
              ],
              where: processWhere || undefined,
              required: Boolean(processWhere)
            }
          ]
        }
      ]
    }
  ]

  const where =
    whereConditions.length === 1
      ? baseWhere
      : { [Op.and]: whereConditions }

  const rows = await db.ProcessInstanceStage.findAll({
    where,
    include: includes,
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: limit + 1,
    subQuery: false
  })

  const hasNext = rows.length > limit
  const pageRows = hasNext ? rows.slice(0, limit) : rows

  return { rows: pageRows, hasNext }
}

function prefixTransactionConditions (conditions = []) {
  return conditions.map(cond => {
    if (cond[Op.and]) {
      return {
        [Op.and]: cond[Op.and].map(inner => {
          const out = {}
          for (const [k, v] of Object.entries(inner)) {
            out[`$transaction.${k}$`] = v
          }
          return out
        })
      }
    }

    if (cond[Op.or]) {
      return { [Op.or]: prefixTransactionConditions(cond[Op.or]) }
    }

    const out = {}
    for (const [k, v] of Object.entries(cond)) {
      out[`$transaction.${k}$`] = v
    }
    return out
  })
}

async function getTransactionIdsHavingTypeDocs (typeDocIds = []) {
  if (!typeDocIds.length) {
    return null
  }

  const rows = await db.DocumentSignature.findAll({
    attributes: ['transaction_id'],
    where: {
      type_doc_id:
        typeDocIds.length === 1
          ? typeDocIds[0]
          : { [Op.in]: typeDocIds }
    },
    group: ['transaction_id'],
    raw: true
  })

  return rows.map(row => Number(row.transaction_id)).filter(Boolean)
}

function intersectIds (baseIds, filterIds) {
  if (filterIds == null) {
    return baseIds
  }

  if (!filterIds.length) {
    return []
  }

  const allowed = new Set(filterIds)
  return baseIds.filter(id => allowed.has(Number(id)))
}

async function getTerminalInstancesByDepartments ({
  departmentIds,
  transactionStatus,
  fromDate = null,
  toDate = null,
  limit,
  cursor = null,
  searchFilters = null
}) {
  let transactionIds = await getTransactionIdsPassedDepartments(departmentIds)

  if (!transactionIds.length) {
    return { rows: [], hasNext: false }
  }

  const {
    buildTransactionFieldWhere,
    buildProcessDefinitionWhere,
    buildApplicantNameOrConditions,
    likeContains,
    normalizeTypeDocIds
  } = require('../utils/taskSearchFilters')

  const filters = searchFilters || {}
  const typeDocIds = normalizeTypeDocIds(filters)
  if (typeDocIds.length) {
    const withDocs = await getTransactionIdsHavingTypeDocs(typeDocIds)
    transactionIds = intersectIds(transactionIds, withDocs)
    if (!transactionIds.length) {
      return { rows: [], hasNext: false }
    }
  }

  const fieldFilters = { ...filters, q: null }
  const fieldAnd = buildTransactionFieldWhere(fieldFilters)

  const transactionWhere = {
    status: transactionStatus
  }

  if (fromDate || toDate) {
    transactionWhere.created_at = {}
    if (fromDate) transactionWhere.created_at[Op.gte] = fromDate
    if (toDate) transactionWhere.created_at[Op.lte] = toDate
  }

  if (fieldAnd.length) {
    transactionWhere[Op.and] = fieldAnd
  }

  const processWhere = buildProcessDefinitionWhere(filters)
  const baseWhere = {
    status: 'completed',
    transaction_id: { [Op.in]: transactionIds }
  }

  const whereConditions = [baseWhere]

  if (cursor) {
    const createdAt = new Date(cursor.t)
    whereConditions.push({
      [Op.or]: [
        { '$process_definition.priority$': { [Op.lt]: cursor.p } },
        {
          [Op.and]: [
            { '$process_definition.priority$': cursor.p },
            { '$transaction.created_at$': { [Op.gt]: createdAt } }
          ]
        },
        {
          [Op.and]: [
            { '$process_definition.priority$': cursor.p },
            { '$transaction.created_at$': createdAt },
            { id: { [Op.gt]: cursor.id } }
          ]
        }
      ]
    })
  }

  if (filters.q) {
    const applicantOr = prefixTransactionConditions(
      buildApplicantNameOrConditions(filters.q)
    )
    whereConditions.push({
      [Op.or]: [
        ...applicantOr,
        { '$process_definition.name$': likeContains(filters.q) }
      ]
    })
  }

  const where =
    whereConditions.length === 1
      ? baseWhere
      : { [Op.and]: whereConditions }

  const rows = await db.ProcessInstance.findAll({
    where,
    attributes: ['id', 'process_definition_id', 'current_stage_id', 'created_at', 'updated_at'],
    include: [
      TERMINAL_INCLUDES[0],
      {
        ...TERMINAL_INCLUDES[1],
        attributes: [
          ...TERMINAL_INCLUDES[1].attributes,
          'type_trans_id'
        ],
        where: processWhere || undefined,
        required: Boolean(processWhere)
      },
      {
        ...TERMINAL_INCLUDES[2],
        where: transactionWhere,
        attributes: [
          ...TERMINAL_INCLUDES[2].attributes,
          'mother_name',
          'national_id',
          'code'
        ]
      }
    ],
    order: [
      [{ model: db.ProcessDefinition, as: 'process_definition' }, 'priority', 'DESC'],
      [{ model: db.Transaction, as: 'transaction' }, 'created_at', 'ASC'],
      ['id', 'ASC']
    ],
    limit: limit + 1,
    subQuery: false
  })

  const hasNext = rows.length > limit
  return { rows: hasNext ? rows.slice(0, limit) : rows, hasNext }
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
  getUserIdsForOrgDeptRoleIds,
  getRunningInstancesForAssigneeRoute,
  getRunningInstancesForProcessDefinitions,
  getStagesCompletedByUser,
  getTerminalInstancesByDepartments,
  countTerminalTransactionsByDepartments,
  getRunningInstancesForDepartmentTransactions,
  getLatestStageNamesByTransactionIds,
  userHasDepartmentsAccess,
  countStagesByProcessDefinitionIds,
  countCompletedStagesByTransactionIds,
  getCompletedStageCodesByTransactionIds,
  getTransactionIdsHavingTypeDocs
}
