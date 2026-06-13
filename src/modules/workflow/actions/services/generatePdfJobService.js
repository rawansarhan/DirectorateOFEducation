'use strict'

const documentInstanceRepository = require('../../../transaction/document/repositories/documentInstanceRepository')
const documentTemplateRepository = require('../../../requirements/DocTemp/repositories/documentTemplateRepository')
const {
  generatePdfFromTemplate
} = require('../../../transaction/document/services/pdfGenerationService')

async function resolveDocumentInstance ({
  transactionId,
  templateId,
  documentInstanceId = null
}) {
  if (documentInstanceId) {
    const byId = await documentInstanceRepository.findById(documentInstanceId)

    if (
      byId &&
      byId.transaction_id === transactionId &&
      Number(byId.document_template_id) === Number(templateId)
    ) {
      return byId
    }
  }

  return documentInstanceRepository.findByTransactionAndTemplate(
    transactionId,
    templateId
  )
}

/**
 * Generates PDF for a transaction template (used by outbox worker).
 */
async function executeGeneratePdfJob ({
  transaction_id: transactionId,
  template_id: templateId,
  document_instance_id: documentInstanceId = null
}) {
  const numericTransactionId = Number(transactionId)
  const numericTemplateId = Number(templateId)

  if (!Number.isInteger(numericTransactionId) || numericTransactionId <= 0) {
    throw new Error('GENERATE_PDF: transaction_id غير صالح')
  }

  if (!Number.isInteger(numericTemplateId) || numericTemplateId <= 0) {
    throw new Error('GENERATE_PDF payload.template_id مطلوب')
  }

  const documentInstance = await resolveDocumentInstance({
    transactionId: numericTransactionId,
    templateId: numericTemplateId,
    documentInstanceId
  })

  if (!documentInstance) {
    throw new Error(
      `document_instance غير موجود — أرسل templates[{ id: ${numericTemplateId}, values: {...} }] في USER_TASK أولاً`
    )
  }

  if (documentInstance.generated_pdf_path) {
    return {
      type: 'pdf',
      status: 'generated',
      skipped: true,
      template_id: numericTemplateId,
      document_instance_id: documentInstance.id,
      transaction_id: numericTransactionId,
      generated_pdf_path: documentInstance.generated_pdf_path
    }
  }

  const documentTemplate = await documentTemplateRepository.findOneActiveById(
    numericTemplateId
  )

  if (!documentTemplate) {
    throw new Error(
      `قالب الوثيقة (template_id=${numericTemplateId}) غير موجود أو غير نشط`
    )
  }

  const generation = await generatePdfFromTemplate({
    documentTemplate,
    documentInstance
  })

  await documentInstanceRepository.updateInstance(documentInstance, {
    generated_pdf_path: generation.generated_pdf_path,
    status: 'generated'
  })

  return {
    type: 'pdf',
    status: 'generated',
    template_id: numericTemplateId,
    document_instance_id: documentInstance.id,
    transaction_id: numericTransactionId,
    generated_pdf_path: generation.generated_pdf_path,
    filled_keys: generation.filled_keys,
    skipped_keys: generation.skipped_keys,
    values_used: generation.values_used,
    engine_type: documentTemplate.engine_type
  }
}

module.exports = {
  executeGeneratePdfJob
}
