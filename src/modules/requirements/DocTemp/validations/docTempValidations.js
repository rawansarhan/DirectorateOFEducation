'use strict'

const fs = require('fs')
const path = require('path')
const Joi = require('joi')
const {
  normalizeStoredFilePath,
  toPublicFileUrl
} = require('../../../../core/utils/filePath')
const { validateDocumentTemplateConfigJson } = require('../../../workflow/stageConfig/validations/stageConfigSchema')
const CONFIG_JSON_ROOT_KEYS = new Set([
  'form_id',
  'form_name',
  'widgets',
  'pdf'
])

function formatValidationError (error) {
  return error.details.map(d => d.message).join(' | ')
}

function parseConfigJsonField (value) {
  if (value == null || value === '') {
    return { error: 'حقل config_json مطلوب' }
  }

  if (typeof value === 'object') {
    return { value }
  }

  if (typeof value === 'string') {
    try {
      return { value: JSON.parse(value) }
    } catch (_) {
      return { error: 'حقل config_json يجب أن يكون JSON صالح' }
    }
  }

  return { error: 'حقل config_json غير صالح' }
}

function assertAllowedConfigJsonRootKeys (configJson = {}) {
  const unknownKeys = Object.keys(configJson).filter(
    key => !CONFIG_JSON_ROOT_KEYS.has(key)
  )

  if (unknownKeys.length) {
    return {
      error: `حقول غير مسموحة في config_json: ${unknownKeys.join(', ')} — المسموح: form_id, form_name, widgets, pdf`
    }
  }

  return null
}

function validateConfigJson (configJson) {
  const parsed = parseConfigJsonField(configJson)

  if (parsed.error) {
    return { error: parsed.error }
  }

  const rootKeysError = assertAllowedConfigJsonRootKeys(parsed.value)

  if (rootKeysError) {
    return rootKeysError
  }

  const { error, value } = validateDocumentTemplateConfigJson(parsed.value)

  if (error) {
    return { error: formatValidationError(error) }
  }

  return { value }
}

function resolveConfigJsonFromRequestBody (body = {}) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'حقل config_json مطلوب' }
  }

  const keys = Object.keys(body)

  if (keys.length === 1 && keys[0] === 'config_json') {
    return validateConfigJson(body.config_json)
  }

  const unknownTopLevelKeys = keys.filter(key => !CONFIG_JSON_ROOT_KEYS.has(key))

  if (unknownTopLevelKeys.length) {
    return {
      error: `حقول غير مسموحة: ${unknownTopLevelKeys.join(', ')} — يُسمح فقط بـ form_id, form_name, widgets, pdf`
    }
  }

  if (!keys.length) {
    return { error: 'حقل config_json مطلوب' }
  }

  return validateConfigJson(body)
}

function resolveTemplateFileReference ({ path: storedPath, url }) {
  const normalizedPath = normalizeStoredFilePath(storedPath)

  if (!normalizedPath || !normalizedPath.startsWith('/uploads/')) {
    return { error: 'path غير صالح — يجب أن يكون مساراً تحت /uploads/' }
  }

  const absolutePath = path.join(
    process.cwd(),
    normalizedPath.replace(/^\//, '')
  )

  if (!fs.existsSync(absolutePath)) {
    return { error: 'ملف القالب غير موجود على القرص — ارفعه أولاً عبر extract-fields' }
  }

  if (path.extname(absolutePath).toLowerCase() !== '.pdf') {
    return { error: 'ملف القالب يجب أن يكون PDF' }
  }

  const expectedUrl = toPublicFileUrl(normalizedPath)

  if (!url || String(url).trim() !== expectedUrl) {
    return { error: 'url لا يطابق path — استخدم القيم المُرجعة من extract-fields' }
  }

  return {
    file_path: normalizedPath,
    url: expectedUrl
  }
}

const typeDocIdSchema = Joi.number().integer().positive().required()
  .messages({
    'any.required': 'حقل type_doc_id مطلوب',
    'number.base': 'حقل type_doc_id يجب أن يكون رقماً صحيحاً',
    'number.integer': 'حقل type_doc_id يجب أن يكون رقماً صحيحاً',
    'number.positive': 'حقل type_doc_id يجب أن يكون رقماً موجباً'
  })

const createDocumentTemplateValidation = data => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(255).required()
      .messages({
        'any.required': 'حقل name مطلوب',
        'string.empty': 'حقل name لا يمكن أن يكون فارغاً'
      }),

    type_doc_id: typeDocIdSchema,

    TypeDoc_id: Joi.any().strip(),

    config_json: Joi.any().required()
      .messages({
        'any.required': 'حقل config_json مطلوب'
      }),

    path: Joi.string().trim().min(1).required()
      .messages({
        'any.required': 'حقل path مطلوب',
        'string.empty': 'حقل path لا يمكن أن يكون فارغاً'
      }),

    url: Joi.string().trim().uri().required()
      .messages({
        'any.required': 'حقل url مطلوب',
        'string.uri': 'حقل url يجب أن يكون رابطاً صالحاً'
      })
  }).unknown(false)

  const { error, value } = schema.validate(data, { abortEarly: false })

  if (error) {
    return { error, value: null }
  }

  const fileRef = resolveTemplateFileReference({
    path: value.path,
    url: value.url
  })

  if (fileRef.error) {
    return {
      error: {
        details: [{ message: fileRef.error }]
      },
      value: null
    }
  }

  const configResult = validateConfigJson(value.config_json)

  if (configResult.error) {
    return {
      error: {
        details: [{ message: configResult.error }]
      },
      value: null
    }
  }

  return {
    error: null,
    value: {
      name: value.name,
      type_doc_id: value.type_doc_id,
      file_path: fileRef.file_path,
      file_url: fileRef.url,
      config_json: configResult.value
    }
  }
}

const updateDocumentTemplateValidation = data => {
  const configResult = resolveConfigJsonFromRequestBody(data)

  if (configResult.error) {
    return {
      error: {
        details: [{ message: configResult.error }]
      },
      value: null
    }
  }

  return {
    error: null,
    value: {
      config_json: configResult.value
    }
  }
}

module.exports = {
  createDocumentTemplateValidation,
  updateDocumentTemplateValidation,
  formatValidationError,
  parseConfigJsonField,
  validateConfigJson,
  resolveConfigJsonFromRequestBody,
  resolveTemplateFileReference
}
