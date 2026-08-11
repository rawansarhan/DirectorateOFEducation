'use strict'

const Joi = require('joi')

const optionalPositiveInt = Joi.number().integer().positive()

const adminSearchQuerySchema = Joi.object({
  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(70).optional(),

  q: Joi.string().trim().max(120).allow('', null).optional(),
  search: Joi.string().trim().max(120).allow('', null).optional(),

  name: Joi.string().trim().max(255).allow('', null).optional(),
  code: Joi.string().trim().max(128).allow('', null).optional(),

  type_trans_id: optionalPositiveInt.optional(),
  organization_id: optionalPositiveInt.optional(),
  is_complaint: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  /** alias شائع — نفس is_complaint */
  is_complete: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  is_active: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  approval_status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED').optional(),
  include_inactive: Joi.boolean().truthy('true', '1').falsy('false', '0').optional()
}).unknown(false)

/** بحث موظف: organization_id إجباري + فلاتر محدودة */
const employeeOrgSearchQuerySchema = Joi.object({
  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(70).optional(),

  organization_id: optionalPositiveInt.required().messages({
    'any.required': 'organization_id مطلوب'
  }),

  q: Joi.string().trim().max(120).allow('', null).optional(),
  search: Joi.string().trim().max(120).allow('', null).optional(),
  name: Joi.string().trim().max(255).allow('', null).optional(),
  code: Joi.string().trim().max(128).allow('', null).optional(),
  type_trans_id: optionalPositiveInt.optional(),
  is_complaint: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  is_complete: Joi.boolean().truthy('true', '1').falsy('false', '0').optional()
}).unknown(false)

function normalizeSearchValue (value) {
  const textQ = value.q || value.search || null
  const isComplaint =
    value.is_complaint != null
      ? value.is_complaint
      : value.is_complete != null
        ? value.is_complete
        : null

  return {
    ...value,
    q: textQ ? String(textQ).trim() : null,
    is_complaint: isComplaint
  }
}

function validateProcessSearchQuery (query = {}) {
  const { error, value } = adminSearchQuerySchema.validate(query, {
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

  return { error: null, value: normalizeSearchValue(value) }
}

function validateEmployeeOrgProcessSearchQuery (query = {}) {
  const { error, value } = employeeOrgSearchQuerySchema.validate(query, {
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

  return {
    error: null,
    value: {
      ...normalizeSearchValue(value),
      // افتراض تشغيلي آمن للموظف: معتمدة + نشطة فقط
      approval_status: 'APPROVED',
      is_active: true,
      include_inactive: false
    }
  }
}

module.exports = {
  validateProcessSearchQuery,
  validateEmployeeOrgProcessSearchQuery
}
