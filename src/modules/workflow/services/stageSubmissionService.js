'use strict'

const {
  validateStageSubmissionPayload,
  normalizeSubmissionPayload,
  SUBMISSION_SCHEMA_VERSION
} = require('../schemas/stageSubmissionSchema')

const {
  assertPayloadAgainstStageConfig
} = require('../validators/stageSubmissionValidator')

const processRepository = require('../repositories/processRepository')
const stageRepository = require('../repositories/stageRepository')
const stageConfigRepository = require('../repositories/stageConfigRepository')

function validateSubmissionRequest (payload = {}, options = {}) {
  const {
    mode = 'draft',
    requireVariables = false,
    requireSignature = false
  } = options

  const { value, error } = validateStageSubmissionPayload(payload, {
    mode,
    requireVariables,
    requireSignature
  })

  if (error) {
    throw new Error(error)
  }

  return normalizeSubmissionPayload(value)
}

async function validateSubmissionAgainstConfig (
  payload = {},
  configJson = {},
  options = {}
) {
  const normalized = validateSubmissionRequest(payload, options)

  await assertPayloadAgainstStageConfig(normalized, configJson, {
    ...options,
    uiJson: options.uiJson || {}
  })

  return normalized
}

function buildStoredSubmissionData (normalizedPayload) {
  return {
    schema_version: normalizedPayload.schema_version || SUBMISSION_SCHEMA_VERSION,
    submission: {
      fields: normalizedPayload.fields,
      files: normalizedPayload.files,
      templates: normalizedPayload.templates,
      actions: normalizedPayload.actions,
      variables: normalizedPayload.variables,
      notes: normalizedPayload.notes,
      signature: normalizedPayload.signature
    },
    ...normalizedPayload.field_map,
    files_meta: normalizedPayload.files
  }
}

async function loadAuthStageConfigByProcessCode (processCode) {
  const process = await processRepository.findByCode(processCode)

  if (!process) {
    throw new Error('العملية المرتبطة بالمعاملة غير موجودة')
  }

  const stage = await stageRepository.findFirstAuthStage(process.id)

  if (!stage) {
    throw new Error('لا توجد مرحلة AUTH لهذه العملية')
  }

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)

  if (!stageConfig?.config_json) {
    throw new Error('إعدادات مرحلة التقديم غير موجودة')
  }

  return stageConfig.config_json
}

async function loadAuthStageConfigBundleByProcessCode (processCode) {
  const process = await processRepository.findByCode(processCode)

  if (!process) {
    throw new Error('العملية المرتبطة بالمعاملة غير موجودة')
  }

  const stage = await stageRepository.findFirstAuthStage(process.id)

  if (!stage) {
    throw new Error('لا توجد مرحلة AUTH لهذه العملية')
  }

  const stageConfig = await stageConfigRepository.findByStageId(stage.id)

  if (!stageConfig?.config_json) {
    throw new Error('إعدادات مرحلة التقديم غير موجودة')
  }

  return {
    config_json: stageConfig.config_json,
    ui_json: stageConfig.ui_json || {}
  }
}

module.exports = {
  SUBMISSION_SCHEMA_VERSION,
  validateSubmissionRequest,
  validateSubmissionAgainstConfig,
  buildStoredSubmissionData,
  loadAuthStageConfigByProcessCode,
  loadAuthStageConfigBundleByProcessCode
}
