'use strict'

const {
  validateStageSubmissionPayload,
  validateSubmitTransactionPayload,
  normalizeSubmissionPayload,
  SUBMISSION_SCHEMA_VERSION
} = require('../schemas/stageSubmissionSchema')

const {
  assertPayloadAgainstStageConfig
} = require('../validators/stageSubmissionValidator')

const processRepository = require('../processDefinition/repositories/processRepository')
const stageRepository = require('../processDefinition/repositories/stageRepository')
const stageConfigRepository = require('../stageConfig/repositories/stageConfigRepository')
const { buildStageFormSnapshot } = require('./stageFormSnapshotBuilder')

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

  await assertPayloadAgainstStageConfig(normalized, configJson, options)

  return normalized
}

async function validateSubmitTransactionRequest (
  payload = {},
  configJson = {},
  { stageName = null } = {}
) {
  const { value, error, details, allowed_fields: allowedFields } =
    validateSubmitTransactionPayload(payload)

  if (error) {
    const err = new Error(error)
    err.code = 'VALIDATION_ERROR'
    err.details = details
    err.validation = { allowed_fields: allowedFields }
    throw err
  }

  if (
    value.stage_name &&
    stageName &&
    String(value.stage_name).trim() !== String(stageName).trim()
  ) {
    throw new Error('stage_name لا يطابق مرحلة التقديم (AUTH)')
  }

  const normalized = normalizeSubmissionPayload(value)
  normalized.decision = normalized.decision || 'submit'

  await assertPayloadAgainstStageConfig(normalized, configJson, {
    mode: 'submit'
  })

  return normalized
}

function resolveStoredDecision (payload = {}) {
  if (payload.decision) {
    return payload.decision
  }

  if (payload.variables?.action) {
    return payload.variables.action
  }

  if (payload.variables?.decision) {
    return payload.variables.decision
  }

  return null
}

function buildStoredStageData (payload = {}, { stageName = null, configJson = null } = {}) {
  const base = {
    stage_name: stageName || payload.stage_name || null,
    templates: payload.templates || [],
    decision: resolveStoredDecision(payload),
    note: payload.note ?? payload.notes ?? ''
  }

  if (configJson?.widgets?.length) {
    return {
      ...base,
      ...buildStageFormSnapshot(configJson, payload)
    }
  }

  return {
    ...base,
    form_id: configJson?.form_id ?? null,
    form_name: configJson?.form_name ?? null,
    fields: payload.fields || [],
    files: payload.files || []
  }
}

function buildStoredSubmissionData (normalizedPayload, options = {}) {
  return buildStoredStageData(normalizedPayload, options)
}

async function loadAuthStageByProcessCode (processCode) {
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
    stage,
    configJson: stageConfig.config_json
  }
}

async function loadAuthStageConfigByProcessCode (processCode) {
  const { configJson } = await loadAuthStageByProcessCode(processCode)
  return configJson
}

module.exports = {
  SUBMISSION_SCHEMA_VERSION,
  validateSubmissionRequest,
  validateSubmissionAgainstConfig,
  validateSubmitTransactionRequest,
  buildStoredStageData,
  buildStoredSubmissionData,
  loadAuthStageByProcessCode,
  loadAuthStageConfigByProcessCode
}
