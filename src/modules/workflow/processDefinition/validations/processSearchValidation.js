'use strict'

const Joi = require('joi')

const optionalPositiveInt = Joi.number().integer().positive()

const searchQuerySchema = Joi.object({
  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(70).optional(),

  q: Joi.string().trim().max(120).allow('', null).optional(),
  search: Joi.string().trim().max(120).allow('', null).optional(),

  name: Joi.string().trim().max(255).allow('', null).optional(),
  code: Joi.string().trim().max(128).allow('', null).optional(),

  type_trans_id: optionalPositiveInt.optional(),
  organization_id: optionalPositiveInt.optional(),
  is_complaint: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  is_active: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),
  approval_status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED').optional(),

  /** إن true يعرض غير النشطة أيضاً (الافتراضي: النشطة المعتمدة فقط) */
  include_inactive: Joi.boolean().truthy('true', '1').falsy('false', '0').optional()
}).unknown(false)

function validateProcessSearchQuery (query = {}) {
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

  const textQ = value.q || value.search || null

  return {
    error: null,
    value: {
      ...value,
      q: textQ ? String(textQ).trim() : null
    }
  }
}

module.exports = {
  validateProcessSearchQuery
}
