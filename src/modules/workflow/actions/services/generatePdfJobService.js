'use strict'

const documentTemplateRepository = require('../../../requirements/DocTemp/repositories/documentTemplateRepository')
const {
  documentInstanceRepository,
  transactionRepository,
  fillTemplatePdfDocument,
  persistFilledPdfDocument,
  ensureGenesisHash
} = require('../../../transaction/public')
const {
  resolveTemplateValuesFromSealedStages,
  extractTemplateValuesFromList
} = require('../../../transaction/integrityChain/services/sealedSnapshotService')
const {
  buildGeneratedPdfHistoryFields,
  findGeneratePdfStageKey,
  attachGeneratedPdfToUserTaskTemplates
} = require('../../taskCamunda/utils/generatedPdfHistory')

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

/**
 * مصدر القيم لـ GENERATE_PDF:
 * 1) لقطات process_instance_stage المختومة فقط (الأولوية والأمان)
 * 2) إن لم توجد أي لقطة مختومة (معاملات قديمة قبل الختم) → fallback legacy على transactions.data
 * لا يُستخدم document_instance.data_json كمصدر مستقل — يُعاد ملؤه من الختم.
 */
async function resolveTemplateValues ({
  transactionId,
  templateId
}) {
  const sealedResult = await resolveTemplateValuesFromSealedStages(
    transactionId,
    templateId
  )

  if (sealedResult.sealed_count > 0) {
    if (!sealedResult.values) {
      const error = new Error(
        `قيم القالب (template_id=${templateId}) غير موجودة في اللقطات المختومة — أرسل templates في USER_TASK قبل GENERATE_PDF`
      )
      error.code = 'SEALED_TEMPLATE_VALUES_MISSING'
      throw error
    }

    return {
      values: sealedResult.values,
      source: 'sealed_stage',
      seal: sealedResult.source
    }
  }

  // legacy: معاملات بلا ختم
  const transaction = await transactionRepository.findById(transactionId)
  const fromTransaction = findTemplateValuesInTransactionData(
    transaction?.data,
    templateId
  )

  if (fromTransaction) {
    return {
      values: fromTransaction,
      source: 'legacy_transaction_data',
      seal: null
    }
  }

  return {
    values: null,
    source: null,
    seal: null
  }
}

async function applyGeneratedPdfToTransactionHistory ({
  transactionId,
  stageCode = null,
  templateId = null,
  documentInstanceId = null,
  generatedPdfPath = null
}) {
  const pdfFields = buildGeneratedPdfHistoryFields({
    documentInstanceId,
    generatedPdfPath
  })

  if (!pdfFields) {
    return null
  }

  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    return null
  }

  let transactionData = { ...(transaction.data || {}) }

  // 1) خزّن الملف داخل template value في مرحلة USER_TASK المالكة للقالب
  const attached = attachGeneratedPdfToUserTaskTemplates(transactionData, {
    templateId,
    documentInstanceId,
    generatedPdfPath
  })
  transactionData = attached.data

  // 2) أبقِ الحقول أيضاً على مرحلة SERVICE_TASK GENERATE_PDF (توافق خلفي)
  const stageKey =
    (stageCode && transactionData[stageCode] ? stageCode : null) ||
    findGeneratePdfStageKey(transactionData, templateId)

  if (stageKey) {
    transactionData[stageKey] = {
      ...transactionData[stageKey],
      ...pdfFields
    }
  } else if (!attached.updated) {
    return null
  }

  return transactionRepository.updateDataOptimistic(
    transactionId,
    transactionData,
    transaction.version
  )
}

/**
 * Generates PDF for a transaction template (used by strategy + outbox worker).
 * لا يُنشئ document_instance إلا بعد نجاح ملء القالب وحفظ الملف.
 */
async function executeGeneratePdfJob ({
  transaction_id: transactionId,
  template_id: templateId,
  document_instance_id: documentInstanceId = null,
  stage_code: stageCode = null,
  // true للـ outbox فقط — مسار الـ sync يكتب الحقول عبر runServiceTaskActions
  persist_history: persistHistory = false
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
    if (persistHistory) {
      await applyGeneratedPdfToTransactionHistory({
        transactionId: numericTransactionId,
        stageCode,
        templateId: numericTemplateId,
        documentInstanceId: documentInstance.id,
        generatedPdfPath: documentInstance.generated_pdf_path
      }).catch(() => null)
    }

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

  const resolved = await resolveTemplateValues({
    transactionId: numericTransactionId,
    templateId: numericTemplateId
  })

  const values = resolved.values

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
  const dataJsonWithSealMeta = {
    ...values,
    _seal: {
      source: resolved.source,
      stage_code: resolved.seal?.stage_code || null,
      content_hash: resolved.seal?.content_hash || null,
      challenge_id: resolved.seal?.challenge_id || null
    }
  }

  if (!documentInstance) {
    documentInstance = await documentInstanceRepository.create({
      transaction_id: numericTransactionId,
      document_template_id: numericTemplateId,
      data_json: dataJsonWithSealMeta,
      generated_pdf_path: null,
      status: 'generated'
    })
  } else {
    await documentInstanceRepository.updateInstance(documentInstance, {
      data_json: dataJsonWithSealMeta
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
      data_json: dataJsonWithSealMeta
    })

    if (persistHistory) {
      await applyGeneratedPdfToTransactionHistory({
        transactionId: numericTransactionId,
        stageCode,
        templateId: numericTemplateId,
        documentInstanceId: documentInstance.id,
        generatedPdfPath: generation.generated_pdf_path
      }).catch(() => null)
    }

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
      engine_type: documentTemplate.engine_type,
      seal_source: resolved.source,
      seal_stage_code: resolved.seal?.stage_code || null,
      seal_content_hash: resolved.seal?.content_hash || null
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
  findTemplateValuesInTransactionData,
  applyGeneratedPdfToTransactionHistory
}
