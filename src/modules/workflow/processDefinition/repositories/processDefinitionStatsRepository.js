'use strict'

const { Op, QueryTypes } = require('sequelize')
const db = require('../../../../entities')
//جلب كل ال procrss مع ال type
async function findAllProcessDefinitionsWithType () {
  return db.ProcessDefinition.findAll({
    attributes: [
      'id',
      'name',
      'code',
      'priority',
      'is_active',
      'approval_status',
      'status'
    ],
    where: {
      approval_status: 'APPROVED'
    },
    include: [
      {
        model: db.TypeTrans,
        as: 'type_trans',
        attributes: ['id', 'name', 'code'],
        required: false
      }
    ],
    order: [
      ['priority', 'DESC'],
      ['id', 'ASC']
    ]
  })
}
// جلب كل ال department مع processDefinitionId
async function findDepartmentsByProcessDefinitionId (processDefinitionId) {
  const rows = await db.sequelize.query(
    `
      SELECT DISTINCT
        d.id,
        d.name
      FROM stages s
      INNER JOIN stage_assignments sa ON sa.stage_id = s.id
      INNER JOIN organization_department_roles odr
        ON odr.id = sa.organization_department_roles_id
      INNER JOIN departments d ON d.id = odr.department_id
      WHERE s.process_definition_id = :processDefinitionId
        AND odr.is_active = true
        AND d.is_active = true
      ORDER BY d.name ASC, d.id ASC
    `,
    {
      replacements: { processDefinitionId },
      type: QueryTypes.SELECT
    }
  )

  return rows.map(row => ({
    id: row.id,
    name: row.name
  }))
}
//جلب كل الtransaction المرتبيطن بالprocess 
async function countTransactionsGroupedByProcessDefinition ({
  fromDate = null,
  toDate = null
} = {}) {
  const replacements = {}
  const dateFilters = []

  if (fromDate) {
    replacements.fromDate = fromDate
    dateFilters.push('t.created_at >= :fromDate')
  }

  if (toDate) {
    replacements.toDate = toDate
    dateFilters.push('t.created_at <= :toDate')
  }

  const dateClause = dateFilters.length
    ? `AND ${dateFilters.join(' AND ')}`
    : ''

  const rows = await db.sequelize.query(
    `
      SELECT
        pi.process_definition_id AS process_definition_id,
        COUNT(*) FILTER (
          WHERE t.status = 'in_progress'
            AND (
              pi.task_lock_user_id IS NULL
              OR pi.task_lock_expires_at IS NULL
              OR pi.task_lock_expires_at <= NOW()
            )
        )::int AS pending_pickup_count,
        COUNT(*) FILTER (
          WHERE t.status = 'in_progress'
            AND pi.task_lock_user_id IS NOT NULL
            AND pi.task_lock_expires_at IS NOT NULL
            AND pi.task_lock_expires_at > NOW()
        )::int AS in_progress_count,
        COUNT(*) FILTER (
          WHERE t.status = 'completed'
        )::int AS completed_count,
        COUNT(*) FILTER (
          WHERE t.status = 'rejected'
        )::int AS rejected_count
      FROM transactions t
      INNER JOIN process_instances pi ON pi.transaction_id = t.id
      WHERE 1 = 1
        ${dateClause}
      GROUP BY pi.process_definition_id
    `,
    {
      replacements,
      type: QueryTypes.SELECT
    }
  )

  const map = new Map()

  for (const row of rows) {
    map.set(Number(row.process_definition_id), {
      pending_pickup: Number(row.pending_pickup_count) || 0,
      in_progress: Number(row.in_progress_count) || 0,
      completed: Number(row.completed_count) || 0,
      rejected: Number(row.rejected_count) || 0
    })
  }

  return map
}

module.exports = {
  findAllProcessDefinitionsWithType,
  findDepartmentsByProcessDefinitionId,
  countTransactionsGroupedByProcessDefinition
}
