'use strict'

const { Op } = require('sequelize')
const { ProcessDefinition, TypeTrans, Organization } = require('../../../../entities')
const { likeContains } = require('../../../../core/utils/escapeLike')

async function searchWithCursor (filters = {}, { limit, cursor = null } = {}) {
  const and = []

  // افتراض آمن للقوائم التشغيلية: معتمدة + نشطة
  if (filters.approval_status) {
    and.push({ approval_status: filters.approval_status })
  } else {
    and.push({ approval_status: 'APPROVED' })
  }

  if (filters.is_active != null) {
    and.push({ is_active: Boolean(filters.is_active) })
  } else if (!filters.include_inactive) {
    and.push({ is_active: true })
  }

  if (filters.name) {
    and.push({ name: likeContains(filters.name) })
  }

  if (filters.code) {
    and.push({ code: likeContains(filters.code) })
  }

  if (filters.type_trans_id) {
    and.push({ type_trans_id: Number(filters.type_trans_id) })
  }

  if (filters.organization_id) {
    and.push({ organization_id: Number(filters.organization_id) })
  }

  if (filters.is_complaint != null) {
    and.push({ is_complaint: Boolean(filters.is_complaint) })
  }

  if (filters.q) {
    and.push({
      [Op.or]: [
        { name: likeContains(filters.q) },
        { code: likeContains(filters.q) },
        { camunda_process_key: likeContains(filters.q) }
      ]
    })
  }

  if (cursor?.k === 'proc' && typeof cursor.n === 'string' && Number.isFinite(Number(cursor.id))) {
    const cursorName = cursor.n
    const cursorId = Number(cursor.id)
    and.push({
      [Op.or]: [
        { name: { [Op.gt]: cursorName } },
        {
          name: cursorName,
          id: { [Op.gt]: cursorId }
        }
      ]
    })
  }

  const rows = await ProcessDefinition.findAll({
    where: { [Op.and]: and },
    attributes: [
      'id',
      'name',
      'code',
      'camunda_process_key',
      'priority',
      'is_active',
      'approval_status',
      'is_complaint',
      'type_trans_id',
      'organization_id',
      'created_at',
      'updated_at'
    ],
    include: [
      {
        model: TypeTrans,
        as: 'type_trans',
        attributes: ['id', 'name'],
        required: false
      },
      {
        model: Organization,
        as: 'organization',
        attributes: ['id', 'name'],
        required: false
      }
    ],
    order: [['name', 'ASC'], ['id', 'ASC']],
    limit: limit + 1
  })

  const hasNext = rows.length > limit
  const pageRows = hasNext ? rows.slice(0, limit) : rows

  return { rows: pageRows, hasNext }
}

module.exports = {
  searchWithCursor
}
