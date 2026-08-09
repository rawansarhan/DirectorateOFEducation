'use strict'

const { Op } = require('sequelize')
const {
  Transaction,
  ProcessInstance,
  ProcessDefinition,
  DocumentSignature,
  DocumentFinalTransaction
} = require('../../../../entities')
const { escapeLike, likeContains } = require('../../../../core/utils/escapeLike')

function startOfDay (dateStr) {
  return new Date(`${dateStr}T00:00:00.000`)
}

function endOfDay (dateStr) {
  return new Date(`${dateStr}T23:59:59.999`)
}

/**
 * أشكال بحث الاسم / الهوية / رقم المعاملة:
 * 1 كلمة → أول/أخير/أب/أم/وطني/id_process/code
 * 2 كلمات → أول+أخير أو أول+أب
 * 3+ → أول+أب+أخير
 */
function buildApplicantNameOrConditions (rawQuery) {
  const tokens = String(rawQuery)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)

  if (!tokens.length) {
    return []
  }

  if (tokens.length === 1) {
    const like = likeContains(tokens[0])
    return [
      { first_name: like },
      { last_name: like },
      { father_name: like },
      { mother_name: like },
      { national_id: like },
      { id_process: like },
      { code: like }
    ]
  }

  if (tokens.length === 2) {
    const [a, b] = tokens
    return [
      {
        [Op.and]: [
          { first_name: likeContains(a) },
          { last_name: likeContains(b) }
        ]
      },
      {
        [Op.and]: [
          { first_name: likeContains(a) },
          { father_name: likeContains(b) }
        ]
      },
      {
        [Op.and]: [
          { first_name: likeContains(b) },
          { last_name: likeContains(a) }
        ]
      }
    ]
  }

  const [a, b, c] = tokens
  return [
    {
      [Op.and]: [
        { first_name: likeContains(a) },
        { father_name: likeContains(b) },
        { last_name: likeContains(c) }
      ]
    },
    {
      [Op.and]: [
        { first_name: likeContains(a) },
        { last_name: likeContains(c) }
      ]
    },
    {
      [Op.and]: [
        { first_name: likeContains(a) },
        { father_name: likeContains(b) }
      ]
    }
  ]
}

async function searchWithCursor (filters = {}, { limit, cursor = null } = {}) {
  const and = []

  // أمان: مسودات الغير لا تظهر في بحث الموظفين
  and.push({ status: { [Op.ne]: 'draft' } })

  if (filters.status) {
    and.push({ status: filters.status })
  } else if (filters.statuses?.length) {
    and.push({ status: { [Op.in]: filters.statuses } })
  }

  if (filters.id_process) {
    and.push({ id_process: likeContains(filters.id_process) })
  }

  if (filters.code) {
    and.push({ code: likeContains(filters.code) })
  }

  if (filters.first_name) {
    and.push({ first_name: likeContains(filters.first_name) })
  }

  if (filters.last_name) {
    and.push({ last_name: likeContains(filters.last_name) })
  }

  if (filters.father_name) {
    and.push({ father_name: likeContains(filters.father_name) })
  }

  if (filters.mother_name) {
    and.push({ mother_name: likeContains(filters.mother_name) })
  }

  if (filters.national_id) {
    and.push({ national_id: likeContains(filters.national_id) })
  }

  if (filters.from_date || filters.to_date) {
    const created = {}
    if (filters.from_date) created[Op.gte] = startOfDay(filters.from_date)
    if (filters.to_date) created[Op.lte] = endOfDay(filters.to_date)
    and.push({ created_at: created })
  }

  const processWhere = {}
  let processRequired = false

  if (filters.process_name) {
    processWhere.name = likeContains(filters.process_name)
    processRequired = true
  }

  if (filters.process_definition_id) {
    processWhere.id = Number(filters.process_definition_id)
    processRequired = true
  }

  if (filters.type_trans_id) {
    processWhere.type_trans_id = Number(filters.type_trans_id)
    processRequired = true
  }

  if (filters.organization_id) {
    processWhere.organization_id = Number(filters.organization_id)
    processRequired = true
  }

  if (filters.is_complaint != null) {
    processWhere.is_complaint = Boolean(filters.is_complaint)
    processRequired = true
  }

  if (filters.q) {
    const textOr = buildApplicantNameOrConditions(filters.q)
    textOr.push({
      '$process_instance.process_definition.name$': likeContains(filters.q)
    })
    and.push({ [Op.or]: textOr })
  }

  if (filters.has_final_document === false) {
    and.push({ '$final_document.id$': null })
  }

  const include = [
    {
      model: ProcessInstance,
      as: 'process_instance',
      required: processRequired,
      attributes: ['id', 'process_definition_id', 'status'],
      include: [
        {
          model: ProcessDefinition,
          as: 'process_definition',
          required: processRequired,
          attributes: [
            'id',
            'name',
            'code',
            'priority',
            'is_complaint',
            'type_trans_id',
            'organization_id'
          ],
          where: Object.keys(processWhere).length ? processWhere : undefined
        }
      ]
    },
    {
      model: DocumentFinalTransaction,
      as: 'final_document',
      required: filters.has_final_document === true,
      attributes: ['id', 'generated_at']
    }
  ]

  const typeDocIds = []
  if (filters.type_doc_id) typeDocIds.push(Number(filters.type_doc_id))
  if (filters.type_doc_ids?.length) {
    typeDocIds.push(...filters.type_doc_ids.map(Number))
  }
  const uniqueTypeDocs = [...new Set(typeDocIds.filter(n => Number.isInteger(n) && n > 0))]

  if (uniqueTypeDocs.length) {
    include.push({
      model: DocumentSignature,
      as: 'document_signatures',
      required: true,
      attributes: [],
      where: {
        type_doc_id:
          uniqueTypeDocs.length === 1
            ? uniqueTypeDocs[0]
            : { [Op.in]: uniqueTypeDocs }
      }
    })
  }

  if (cursor?.k === 'txn' && cursor.t && Number.isFinite(Number(cursor.id))) {
    const cursorAt = new Date(cursor.t)
    const cursorId = Number(cursor.id)
    and.push({
      [Op.or]: [
        { created_at: { [Op.lt]: cursorAt } },
        {
          created_at: cursorAt,
          id: { [Op.lt]: cursorId }
        }
      ]
    })
  }

  const rows = await Transaction.findAll({
    where: { [Op.and]: and },
    include,
    attributes: [
      'id',
      'user_id',
      'code',
      'id_process',
      'status',
      'first_name',
      'last_name',
      'father_name',
      'mother_name',
      'national_id',
      'created_at',
      'updated_at'
    ],
    distinct: true,
    col: 'id',
    subQuery: false,
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: limit + 1
  })

  const hasNext = rows.length > limit
  const pageRows = hasNext ? rows.slice(0, limit) : rows

  return { rows: pageRows, hasNext }
}

module.exports = {
  searchWithCursor,
  escapeLike,
  likeContains,
  buildApplicantNameOrConditions
}
