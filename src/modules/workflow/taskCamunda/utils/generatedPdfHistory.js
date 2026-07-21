'use strict'

const { toPublicFileUrl } = require('../../../../core/utils/filePath')

function buildGeneratedPdfHistoryFields ({
  documentInstanceId = null,
  generatedPdfPath = null
} = {}) {
  const path = generatedPdfPath || null
  const instanceId = documentInstanceId != null ? Number(documentInstanceId) : null

  if (!path && !instanceId) {
    return null
  }

  return {
    id_document_instance: Number.isInteger(instanceId) && instanceId > 0
      ? instanceId
      : null,
    generated_pdf_path: path,
    generated_pdf_url: path ? toPublicFileUrl(path) : null
  }
}

function extractPdfFieldsFromActionResults (actionResults = []) {
  for (const action of actionResults || []) {
    const actionName = String(action?.name || '').toUpperCase()

    if (actionName !== 'GENERATE_PDF') {
      continue
    }

    const result = action.result || {}
    const fields = buildGeneratedPdfHistoryFields({
      documentInstanceId:
        result.document_instance_id ?? result.id_document_instance ?? null,
      generatedPdfPath: result.generated_pdf_path ?? null
    })

    if (fields) {
      return fields
    }
  }

  return null
}

function resolveStagePdfFields (stageData = {}) {
  const topLevel = buildGeneratedPdfHistoryFields({
    documentInstanceId: stageData.id_document_instance ?? null,
    generatedPdfPath: stageData.generated_pdf_path ?? null
  })

  if (topLevel) {
    return {
      ...topLevel,
      generated_pdf_url:
        stageData.generated_pdf_url || topLevel.generated_pdf_url
    }
  }

  return extractPdfFieldsFromActionResults(stageData.actions)
}

function findGeneratePdfStageKey (transactionData = {}, templateId = null) {
  const numericTemplateId = Number(templateId)

  for (const [key, value] of Object.entries(transactionData || {})) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue
    }

    const stageName = String(value.stage_name || value.form_name || '')
      .toUpperCase()
    const actions = Array.isArray(value.actions) ? value.actions : []
    const hasGeneratePdfAction = actions.some(
      action => String(action?.name || '').toUpperCase() === 'GENERATE_PDF'
    )

    if (!hasGeneratePdfAction && !stageName.includes('GENERATE_PDF')) {
      continue
    }

    if (!Number.isInteger(numericTemplateId) || numericTemplateId <= 0) {
      return key
    }

    const matchesTemplate = actions.some(action => {
      if (String(action?.name || '').toUpperCase() !== 'GENERATE_PDF') {
        return false
      }

      const actionTemplateId = Number(
        action.template_id ?? action.result?.template_id
      )

      return actionTemplateId === numericTemplateId
    })

    if (matchesTemplate) {
      return key
    }
  }

  return null
}

module.exports = {
  buildGeneratedPdfHistoryFields,
  extractPdfFieldsFromActionResults,
  resolveStagePdfFields,
  findGeneratePdfStageKey
}
