'use strict'

const {
  toCompleteTaskResponse
} = require('../../mappers/completeTaskMapper')
const documentTemplateRepository =
  require('../../../../requirements/DocTemp/repositories/documentTemplateRepository')
const {
  documentInstanceRepository,
  generateMergedFinalDocument
} = require('../../../../transaction/public')

const LOG_PREFIX = '[CompleteTask]'

const ROOT_SUBMISSION_DATA_KEYS = [
  'stage_name',
  'form_id',
  'form_name',
  'widgets',
  'templates',
  'decision',
  'note',
  'files',
  'fields',
  'completed_by',
  'completed_at'
]

function shouldPersistAuthSubmissionAtRoot ({ isAutoComplete, stage }) {
  return Boolean(isAutoComplete && stage?.auth_type === 'AUTH')
}

function buildRootSubmissionSnapshot (transactionData = {}) {
  const snapshot = {}

  for (const key of ROOT_SUBMISSION_DATA_KEYS) {
    if (Object.prototype.hasOwnProperty.call(transactionData, key)) {
      snapshot[key] = transactionData[key]
    }
  }

  return snapshot
}

async function buildAutoCompleteAuthPayload (transactionData = {}) {
  const snapshot = buildRootSubmissionSnapshot(transactionData)
  const {
    rebuildTemplateItemsForResubmission
  } = require('../../../validators/templateSubmissionValidator')

  return {
    form_id: snapshot.form_id,
    form_name: snapshot.form_name,
    widgets: Array.isArray(snapshot.widgets) ? snapshot.widgets : [],
    templates: await rebuildTemplateItemsForResubmission(snapshot.templates || []),
    note: snapshot.note ?? '',
    decision: snapshot.decision ?? 'submit'
  }
}

function logStep (step, meta = {}) {
  const details = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')

  console.log(`${LOG_PREFIX} ${step}${details ? ` | ${details}` : ''}`)
}

function scheduleFinalDocumentAutoGeneration (transactionId) {
  setImmediate(async () => {
    try {
      const result = await generateMergedFinalDocument(transactionId, {
        force: false,
        requireOwner: false
      })

      logStep('FINAL_DOCUMENT_AUTO_GENERATED', {
        transactionId,
        alreadyExists: Boolean(result?.already_exists),
        filePath: result?.final_document?.file_path || ''
      })
    } catch (err) {
      logStep('FINAL_DOCUMENT_AUTO_GENERATE_FAILED', {
        transactionId,
        error: err?.message || 'unknown'
      })
    }
  })
}

async function enrichTemplatesForResponse (templates = []) {
  const enriched = []

  for (const template of templates) {
    const templateId =
      template.id_template ?? template.id ?? template.template_id ?? null
    const documentInstanceId =
      template.id_document_instance ?? template.document_instance_id ?? null
    const row = templateId
      ? await documentTemplateRepository.findById(templateId)
      : null

    let generatedPdfPath = template.generated_pdf_path ?? null

    if (documentInstanceId && !generatedPdfPath) {
      const instance = await documentInstanceRepository.findById(
        documentInstanceId
      )
      generatedPdfPath = instance?.generated_pdf_path ?? null
    }

    enriched.push({
      id: templateId,
      id_template: templateId,
      document_instance_id: documentInstanceId,
      id_document_instance: documentInstanceId,
      value: template.values ?? template.value ?? {},
      values: template.values ?? template.value ?? {},
      path: row?.file_path || template.path || null,
      generated_pdf_path: generatedPdfPath
    })
  }

  return enriched
}

function buildCompleteResponse ({
  stage,
  stageSnapshot,
  variables = null,
  signingRequest,
  idempotencyKey,
  idempotentReplay,
  workflowStatus,
  templates
}) {
  return {
    message:
      stageSnapshot.decision === 'reject'
        ? 'تم رفض المعاملة بنجاح'
        : 'تم إكمال المهمة بنجاح',
    data: toCompleteTaskResponse({
      stage,
      stageSnapshot,
      variables,
      signatureRequest: signingRequest,
      idempotencyKey,
      idempotentReplay,
      workflowStatus,
      templates
    })
  }
}

function buildCompleteTaskGuardKey (taskId) {
  return `complete:${taskId}`
}

async function withDbTransaction (sequelize, parentTx, fn) {
  if (parentTx) {
    return fn(parentTx)
  }

  return sequelize.transaction(fn)
}

module.exports = {
  LOG_PREFIX,
  ROOT_SUBMISSION_DATA_KEYS,
  shouldPersistAuthSubmissionAtRoot,
  buildRootSubmissionSnapshot,
  buildAutoCompleteAuthPayload,
  logStep,
  scheduleFinalDocumentAutoGeneration,
  enrichTemplatesForResponse,
  buildCompleteResponse,
  buildCompleteTaskGuardKey,
  withDbTransaction
}
