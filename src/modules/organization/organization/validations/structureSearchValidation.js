'use strict'

const Joi = require('joi')

const SCOPES = ['all', 'organization', 'department', 'role']

const searchQuerySchema = Joi.object({
  cursor: Joi.string().trim().max(500).allow('', null).optional(),
  limit: Joi.number().integer().min(1).max(70).optional(),

  q: Joi.string().trim().min(1).max(120).required().messages({
    'any.required': 'q مطلوب',
    'string.min': 'q مطلوب',
    'string.empty': 'q مطلوب'
  }),
  search: Joi.string().trim().max(120).allow('', null).optional(),

  scope: Joi.string()
    .valid(...SCOPES)
    .default('all')
    .optional(),

  organization_id: Joi.number().integer().positive().optional(),
  is_active: Joi.boolean().truthy('true', '1').falsy('false', '0').optional()
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
    return { error: 'q مطلوب', value: null }
  }

  return {
    error: null,
    value: {
      ...value,
      q: textQ,
      scope: value.scope || 'all'
    }
  }
}

module.exports = {
  SCOPES,
  validateStructureSearchQuery
}
