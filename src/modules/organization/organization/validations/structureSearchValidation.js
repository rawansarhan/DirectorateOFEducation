'use strict'

const Joi = require('joi')

const SCOPES = ['all', 'department', 'role', 'employee']

const searchQuerySchema = Joi.object({
  organization_id: Joi.number().integer().positive().required().messages({
    'any.required': 'organization_id مطلوب',
    'number.base': 'organization_id يجب أن يكون رقماً'
  }),

  q: Joi.string().trim().min(1).max(120).required().messages({
    'any.required': 'q مطلوب',
    'string.min': 'q مطلوب (حرف واحد على الأقل)',
    'string.empty': 'q مطلوب'
  }),
  search: Joi.string().trim().max(120).allow('', null).optional(),

  scope: Joi.string()
    .valid(...SCOPES)
    .default('all')
    .optional(),

  is_active: Joi.boolean().truthy('true', '1').falsy('false', '0').optional(),

  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(70).optional()
}).unknown(false)

function validateStructureSearchQuery (query = {}) {
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

  const textQ = (value.q || value.search || '').trim()
  if (!textQ) {
    return { error: 'q مطلوب (حرف واحد على الأقل)', value: null }
  }

  return {
    error: null,
    value: {
      organization_id: Number(value.organization_id),
      q: textQ,
      scope: value.scope || 'all',
      is_active: value.is_active == null ? null : Boolean(value.is_active)
    }
  }
}

module.exports = {
  SCOPES,
  validateStructureSearchQuery
}
