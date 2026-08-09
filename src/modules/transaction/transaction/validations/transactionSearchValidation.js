'use strict'

const Joi = require('joi')

const STATUSES = [
  'submitted',
  'in_progress',
  'completed',
  'rejected'
]

const optionalPositiveInt = Joi.number().integer().positive()
const optionalDate = Joi.string()
  .trim()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD'
  })

const searchQuerySchema = Joi.object({
  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(70).optional(),

  // بحث نصي عام / هوية
  q: Joi.string().trim().max(120).allow('', null).optional(),
  search: Joi.string().trim().max(120).allow('', null).optional(),
  applicant_q: Joi.string().trim().max(120).allow('', null).optional(),

  first_name: Joi.string().trim().max(100).allow('', null).optional(),
  last_name: Joi.string().trim().max(100).allow('', null).optional(),
  father_name: Joi.string().trim().max(100).allow('', null).optional(),
  mother_name: Joi.string().trim().max(100).allow('', null).optional(),
  national_id: Joi.string().trim().max(50).allow('', null).optional(),

  id_process: Joi.string().trim().max(32).allow('', null).optional(),
  code: Joi.string().trim().max(128).allow('', null).optional(),

  status: Joi.string().valid(...STATUSES).optional(),
  statuses: Joi.alternatives().try(
    Joi.array().items(Joi.string().valid(...STATUSES)).max(4),
    Joi.string().trim()
  ).optional(),

  process_name: Joi.string().trim().max(255).allow('', null).optional(),
  process_definition_id: optionalPositiveInt.optional(),
  type_trans_id: optionalPositiveInt.optional(),
  organization_id: optionalPositiveInt.optional(),
  is_complaint: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),

  type_doc_id: optionalPositiveInt.optional(),
  type_doc_ids: Joi.alternatives().try(
    Joi.array().items(optionalPositiveInt).max(20),
    Joi.string().trim()
  ).optional(),

  has_final_document: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),

  from_date: optionalDate.optional(),
  to_date: optionalDate.optional()
}).unknown(false)

function parseCsvOrArray (raw, mapFn) {
  if (raw == null || raw === '') {
    return null
  }

  if (Array.isArray(raw)) {
    return raw.map(mapFn).filter(v => v != null)
  }

  return String(raw)
    .split(',')
    .map(part => mapFn(part.trim()))
    .filter(v => v != null && v !== '')
}

function validateTransactionSearchQuery (query = {}) {
  const { error, value } = searchQuerySchema.validate(query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  })

  if (error) {
    return {
      error: error.details.map(d => d.message).join(' | '),
      value: null
    }
  }

  const statuses = parseCsvOrArray(value.statuses, s => {
    if (!STATUSES.includes(s)) return null
    return s
  })

  const typeDocIds = parseCsvOrArray(value.type_doc_ids, s => {
    const n = Number(s)
    return Number.isInteger(n) && n > 0 ? n : null
  })

  const textQ = value.q || value.search || value.applicant_q || null

  if (value.from_date && value.to_date && value.from_date > value.to_date) {
    return {
      error: 'from_date يجب أن يكون قبل أو يساوي to_date',
      value: null
    }
  }

  return {
    error: null,
    value: {
      ...value,
      q: textQ ? String(textQ).trim() : null,
      statuses: statuses && statuses.length ? [...new Set(statuses)] : null,
      type_doc_ids: typeDocIds && typeDocIds.length ? [...new Set(typeDocIds)] : null,
      status: value.status || null
    }
  }
}

module.exports = {
  STATUSES,
  validateTransactionSearchQuery
}
