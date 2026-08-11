'use strict'

const Joi = require('joi')
const auditLogRepository = require('../../shared/repositories/auditLogRepository')
const {
  parseCursorPaginationQuery,
  encodeCursor,
  buildCursorPaginationMeta,
  emptyCursorPaginatedResult
} = require('../../../../core/utils/pagination')
const { AUDIT_ACTIONS } = require('../../../../core/security/auditActions')

const ACTION_VALUES = Object.values(AUDIT_ACTIONS)

const listSchema = Joi.object({
  user_id: Joi.number().integer().positive().optional(),
  action: Joi.string().trim().max(120).allow('', null).optional(),
  status: Joi.string().valid('success', 'failure', 'blocked').optional(),
  resource_type: Joi.string().trim().max(80).allow('', null).optional(),
  from_date: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'from_date يجب أن يكون بصيغة YYYY-MM-DD'
    }),
  to_date: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': 'to_date يجب أن يكون بصيغة YYYY-MM-DD'
    }),
  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
}).unknown(true)

function parseDayStart (value) {
  if (!value) return null
  return new Date(`${value}T00:00:00.000Z`)
}

function parseDayEnd (value) {
  if (!value) return null
  return new Date(`${value}T23:59:59.999Z`)
}

function toListItem (row) {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row
  const user = plain.user || null

  return {
    id: plain.id,
    user_id: plain.user_id,
    action: plain.action,
    resource_type: plain.resource_type,
    resource_id: plain.resource_id,
    status: plain.status,
    ip_address: plain.ip_address,
    user_agent: plain.user_agent,
    details: plain.details,
    created_at: plain.created_at,
    user: user
      ? {
          id: user.id,
          userName: user.userName,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email
        }
      : null
  }
}

function buildAuditCursor (row) {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row
  return encodeCursor({
    k: 'audit',
    t: new Date(plain.created_at).toISOString(),
    id: Number(plain.id)
  })
}

async function listAuditLogs (query = {}) {
  const { error, value } = listSchema.validate(query, {
    abortEarly: false,
    stripUnknown: true
  })

  if (error) {
    const err = new Error(error.details.map(d => d.message).join(' | '))
    err.statusCode = 400
    err.code = 'VALIDATION_ERROR'
    throw err
  }

  const { limit, cursor, decodedCursor } = parseCursorPaginationQuery(value, {
    defaultLimit: 20,
    maxLimit: 100
  })

  if (decodedCursor && decodedCursor.k !== 'audit') {
    const err = new Error('cursor غير صالح لقائمة سجلات التدقيق')
    err.statusCode = 400
    err.code = 'VALIDATION_ERROR'
    throw err
  }

  const { rows, hasNext } = await auditLogRepository.findFilteredCursor({
    userId: value.user_id || null,
    action: value.action || null,
    status: value.status || null,
    resourceType: value.resource_type || null,
    fromDate: parseDayStart(value.from_date),
    toDate: parseDayEnd(value.to_date),
    limit,
    cursor: decodedCursor
  })

  if (!rows.length) {
    return {
      ...emptyCursorPaginatedResult({ limit, cursor }),
      known_actions: ACTION_VALUES
    }
  }

  const nextCursor = hasNext
    ? buildAuditCursor(rows[rows.length - 1])
    : null

  return {
    items: rows.map(toListItem),
    pagination: buildCursorPaginationMeta({
      limit,
      cursor,
      nextCursor,
      hasNext
    }),
    known_actions: ACTION_VALUES
  }
}

module.exports = {
  listAuditLogs
}
