'use strict'

const Joi = require('joi')
const { pickTypeDocIdFromObject } = require('../../../core/utils/typeDocId')

const typeDocIdFieldSchema = Joi.number()
  .integer()
  .positive()
  .required()
  .messages({
    'any.required': 'type_doc_id مطلوب لكل ملف في files',
    'number.base': 'type_doc_id يجب أن يكون رقماً صحيحاً',
    'number.integer': 'type_doc_id يجب أن يكون رقماً صحيحاً',
    'number.positive': 'type_doc_id يجب أن يكون رقماً موجباً'
  })

function normalizeSubmissionFileItem (file = {}) {
  const type_doc_id = pickTypeDocIdFromObject(file)

  return {
    key: file.key,
    path: file.path,
    type_doc_id,
    original_name: file.original_name,
    mime_type: file.mime_type
  }
}

const submissionFileItemSchema = Joi.object({
  key: Joi.string().max(128).required(),
  path: Joi.string().max(1024).required(),
  type_doc_id: typeDocIdFieldSchema,
  type_Doc_id: Joi.any().strip(),
  TypeDoc_id: Joi.any().strip(),
  type: Joi.any().strip(),
  original_name: Joi.string().max(256).optional(),
  mime_type: Joi.string().max(128).optional()
}).custom((value, helpers) => {
  const normalized = normalizeSubmissionFileItem(value)

  if (!normalized.type_doc_id) {
    return helpers.message({
      custom: `type_doc_id مطلوب للملف "${value.key || ''}"`
    })
  }

  return normalized
})

module.exports = {
  submissionFileItemSchema,
  normalizeSubmissionFileItem,
  typeDocIdFieldSchema
}
