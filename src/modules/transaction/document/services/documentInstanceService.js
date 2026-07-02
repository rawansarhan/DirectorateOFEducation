'use strict'

/**
 * =============================================================================
 * documentInstanceService — ربط templates بالمعاملة (USER_TASK)
 * =============================================================================
 *
 * عند complete / submit-documents/complete مع:
 *   templates: [{ id: 1, values: { employee: "روان", job: "..." } }]
 *
 * 1) ينشئ صفاً في document_instance:
 *      - transaction_id, document_template_id (= id)
 *      - data_json = values
 *      - generated_pdf_path = null  ← يُملأ لاحقاً من GENERATE_PDF
 *
 * 2) يُخزَّن في transaction.data[stageCode].templates:
 *      { id, document_instance_id, values }
 *
 * APIs: POST /workflow/tasks/{id}/complete
 *       POST /workflow/tasks/{id}/submit-documents/complete
 */

const documentInstanceRepository = require('../repositories/documentInstanceRepository')
const documentTemplateRepository = require('../../../requirements/DocTemp/repositories/documentTemplateRepository')

function createDocumentInstanceError (message) {
  const err = new Error(message)
  err.code = 'VALIDATION_ERROR'
  return err
}

async function registerTemplateForTransaction ({
  transactionId,
  templateId,
  values = {},
  dbTransaction = null
}) {
  const numericTemplateId = Number(templateId)

  if (!Number.isInteger(numericTemplateId) || numericTemplateId <= 0) {
    throw createDocumentInstanceError('معرّف القالب (id) غير صالح')
  }

  const template = await documentTemplateRepository.findById(numericTemplateId)

  if (!template || template.is_active !== true) {
    throw createDocumentInstanceError(
      `قالب الوثيقة (id=${numericTemplateId}) غير موجود أو غير نشط`
    )
  }

  const existing = await documentInstanceRepository.findByTransactionAndTemplate(
    transactionId,
    numericTemplateId
  )

  // تحديث values إذا أُعيد إرسال نفس القالب — نحافظ على PDF إن وُجد
  if (existing) {
    await documentInstanceRepository.updateInstance(
      existing,
      {
        data_json: values,
        generated_pdf_path: existing.generated_pdf_path,
        status: existing.generated_pdf_path ? existing.status : 'generated'
      },
      { transaction: dbTransaction }
    )

  return {
    id: numericTemplateId,
    id_template: numericTemplateId,
    document_instance_id: existing.id,
    id_document_instance: existing.id,
    values,
    value: values
  }
  }

  const instance = await documentInstanceRepository.create(
    {
      transaction_id: transactionId,
      document_template_id: numericTemplateId,
      data_json: values,
      generated_pdf_path: null,
      status: 'generated'
    },
    { transaction: dbTransaction }
  )

  return {
    id: numericTemplateId,
    id_template: numericTemplateId,
    document_instance_id: instance.id,
    id_document_instance: instance.id,
    values,
    value: values
  }
}

async function registerTemplatesForTransaction ({
  transactionId,
  templates = [],
  dbTransaction = null
}) {
  if (!Array.isArray(templates) || !templates.length) {
    return []
  }

  const registered = []

  for (const template of templates) {
    const templateId = template.template_id ?? template.id

    registered.push(
      await registerTemplateForTransaction({
        transactionId,
        templateId,
        values: template.values ?? template.value ?? {},
        dbTransaction
      })
    )
  }

  return registered
}

module.exports = {
  registerTemplateForTransaction,
  registerTemplatesForTransaction
}
