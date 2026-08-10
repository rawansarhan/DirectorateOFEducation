'use strict'

const Joi = require('joi')

const optionalPositiveInt = Joi.number().integer().positive()
const optionalDate = Joi.string()
  .trim()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD'
  })

const searchFieldsSchema = {
  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(70).optional(),

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
  process_name: Joi.string().trim().max(255).allow('', null).optional(),

  from_date: optionalDate.optional(),
  to_date: optionalDate.optional(),

  department_ids: Joi.alternatives().try(
    Joi.array().items(optionalPositiveInt).min(1).max(50),
    Joi.string().trim()
  ).required()
}

const departmentSearchSchema = Joi.object(searchFieldsSchema).unknown(false)

function parseDepartmentIdsRaw (raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(Number).filter(n => Number.isInteger(n) && n > 0))]
  }

  return [
    ...new Set(
      String(raw || '')
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => Number.isInteger(n) && n > 0)
    )
  ]
}

function validateDepartmentTransactionSearchQuery (query = {}) {
  const { error, value } = departmentSearchSchema.validate(query, {
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

  const departmentIds = parseDepartmentIdsRaw(value.department_ids)
  if (!departmentIds.length) {
    return {
      error: 'department_ids مطلوب — مثال: ?department_ids=1,2,3',
      value: null
    }
  }

  if (value.from_date && value.to_date && value.from_date > value.to_date) {
    return {
      error: 'from_date يجب أن يكون قبل أو يساوي to_date',
      value: null
    }
  }

  const textQ = value.q || value.search || value.applicant_q || null

  return {
    error: null,
    value: {
      department_ids: departmentIds,
      from_date: value.from_date || null,
      to_date: value.to_date || null,
      searchFilters: {
        q: textQ ? String(textQ).trim() : null,
        first_name: value.first_name || null,
        last_name: value.last_name || null,
        father_name: value.father_name || null,
        mother_name: value.mother_name || null,
        national_id: value.national_id || null,
        id_process: value.id_process || null,
        code: value.code || null,
        process_name: value.process_name || null
      }
    }
  }
}

module.exports = {
  validateDepartmentTransactionSearchQuery
}
