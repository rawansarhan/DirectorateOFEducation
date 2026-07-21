'use strict'

const {
  validateSubmitTransactionPayload,
  SUBMISSION_SCHEMA_VERSION
} = require('../schemas/stageSubmissionSchema')

const {
  validateAndNormalizeUnifiedFormPayload
} = require('./unifiedFormPayloadService')

const processRepository = require('../processDefinition/repositories/processRepository')
const stageRepository = require('../processDefinition/repositories/stageRepository')
const stageConfigRepository = require('../stageConfig/repositories/stageConfigRepository')

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

  const normalized = await validateAndNormalizeUnifiedFormPayload(value, configJson, {
    mode: 'submit',
    stageName
  })

  normalized.decision = 'submit'

  return normalized
}

function resolveStoredDecision (payload = {}) {
  if (payload.decision) {
    return payload.decision
  }

  if (payload.gateway_value) {
    return payload.gateway_value
  }

  return null
}

function mapTemplatesForStorage (templates = []) {
  return (templates || []).map(item => ({
    id_template: item.id_template ?? item.id ?? item.template_id ?? null,
    value: item.values ?? item.value ?? {}
  }))
}

function buildStoredStageData (payload = {}, { stageName = null, configJson = null } = {}) {
  return {
    stage_name: stageName ?? null,
    form_id: payload.form_id ?? configJson?.form_id ?? null,
    form_name: payload.form_name ?? configJson?.form_name ?? null,
    widgets: payload.widgets || [],
    templates: mapTemplatesForStorage(payload.templates || []),
    decision: resolveStoredDecision(payload),
    note: payload.note ?? ''
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
  validateSubmitTransactionRequest,
  buildStoredStageData,
  buildStoredSubmissionData,
  loadAuthStageByProcessCode,
  loadAuthStageConfigByProcessCode
}
