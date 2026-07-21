'use strict'

const documentTemplateRepository = require('../../../requirements/DocTemp/repositories/documentTemplateRepository')
const {
  documentInstanceRepository,
  transactionRepository,
  fillTemplatePdfDocument,
  persistFilledPdfDocument,
  ensureGenesisHash
} = require('../../../transaction/public')

function extractTemplateValuesFromList (templates, templateId) {
  for (const item of templates || []) {
    const id = Number(item?.id_template ?? item?.id ?? item?.template_id)

    if (id === Number(templateId)) {
      const values = item.values ?? item.value ?? null

      if (values && typeof values === 'object') {
        return values
      }
    }
  }

  return null
}

function findTemplateValuesInTransactionData (data, templateId) {
  if (!data || typeof data !== 'object') {
    return null
  }

  const fromRoot = extractTemplateValuesFromList(data.templates, templateId)

  if (fromRoot) {
    return fromRoot
  }

  for (const value of Object.values(data)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue
    }

    if (Array.isArray(value.templates)) {
      const found = extractTemplateValuesFromList(value.templates, templateId)

      if (found) {
        return found
      }
    }
  }

  return null
}

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

async function resolveTemplateValues ({
  transactionId,
  templateId,
  documentInstance = null
}) {
  if (documentInstance?.data_json && typeof documentInstance.data_json === 'object') {
    return documentInstance.data_json
  }

  const transaction = await transactionRepository.findById(transactionId)
  const fromTransaction = findTemplateValuesInTransactionData(
    transaction?.data,
    templateId
  )

  if (fromTransaction) {
    return fromTransaction
  }

  return null
}

/**
 * Generates PDF for a transaction template (used by strategy + outbox worker).
 * لا يُنشئ document_instance إلا بعد نجاح ملء القالب وحفظ الملف.
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

  let documentInstance = await resolveDocumentInstance({
    transactionId: numericTransactionId,
    templateId: numericTemplateId,
    documentInstanceId
  })

  if (documentInstance?.generated_pdf_path) {
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

  const documentTemplate = await documentTemplateRepository.findById(
    numericTemplateId
  )

  if (!documentTemplate) {
    throw new Error(
      `قالب الوثيقة (template_id=${numericTemplateId}) غير موجود`
    )
  }

  const values = await resolveTemplateValues({
    transactionId: numericTransactionId,
    templateId: numericTemplateId,
    documentInstance
  })

  if (!values) {
    throw new Error(
      `قيم القالب (template_id=${numericTemplateId}) غير موجودة — أرسل templates[{ id: ${numericTemplateId}, widgets/value }] في USER_TASK أولاً`
    )
  }

  // 1) الملء في الذاكرة أولاً — إن فشل لا يُنشأ document_instance
  const filled = await fillTemplatePdfDocument({
    documentTemplate,
    dataJson: values
  })

  const genesisHash = await ensureGenesisHash({ id: numericTransactionId })

  const createdNow = !documentInstance

  if (!documentInstance) {
    documentInstance = await documentInstanceRepository.create({
      transaction_id: numericTransactionId,
      document_template_id: numericTemplateId,
      data_json: values,
      generated_pdf_path: null,
      status: 'generated'
    })
  } else {
    await documentInstanceRepository.updateInstance(documentInstance, {
      data_json: values
    })
  }

  try {
    // 2) حفظ الملف + QR بعد وجود الـ instance
    const generation = await persistFilledPdfDocument({
      pdfDoc: filled.pdfDoc,
      configJson: filled.configJson,
      documentTemplate,
      documentInstance,
      genesisHash,
      values: filled.values,
      filled_keys: filled.filled_keys,
      skipped_keys: filled.skipped_keys,
      flattened: filled.flattened
    })

    await documentInstanceRepository.updateInstance(documentInstance, {
      generated_pdf_path: generation.generated_pdf_path,
      content_hash: generation.content_hash,
      status: 'generated',
      data_json: values
    })

    return {
      type: 'pdf',
      status: 'generated',
      template_id: numericTemplateId,
      document_instance_id: documentInstance.id,
      transaction_id: numericTransactionId,
      generated_pdf_path: generation.generated_pdf_path,
      content_hash: generation.content_hash,
      filled_keys: generation.filled_keys,
      skipped_keys: generation.skipped_keys,
      values_used: generation.values_used,
      engine_type: documentTemplate.engine_type
    }
  } catch (error) {
    // إن فشل الحفظ بعد إنشاء الصف — احذفه حتى لا تبقى نسخ فاشلة
    if (createdNow) {
      await documentInstanceRepository.destroyInstance(documentInstance).catch(() => {})
    }

    throw error
  }
}

module.exports = {
  executeGeneratePdfJob,
  findTemplateValuesInTransactionData
}
