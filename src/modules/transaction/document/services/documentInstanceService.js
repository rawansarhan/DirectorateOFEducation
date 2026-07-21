'use strict'

/**
 * =============================================================================
 * documentInstanceService — ربط قيم القوالب بالمعاملة (USER_TASK)
 * =============================================================================
 *
 * عند complete / submit مع:
 *   templates: [{ id: 1, values: { employee: "روان", job: "..." } }]
 *
 * يحفظ القيم فقط في transaction.data[stage].templates — بدون إنشاء document_instance.
 * صف document_instance يُنشأ لاحقاً فقط عند نجاح GENERATE_PDF.
 *
 * APIs: POST /workflow/tasks/{id}/complete
 *       POST /workflow/tasks/{id}/submit-documents/complete
 */

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

  if (!template) {
    throw createDocumentInstanceError(
      `قالب الوثيقة (id=${numericTemplateId}) غير موجود`
    )
  }

  // لا نُنشئ document_instance هنا — يُنشأ لاحقاً عند نجاح GENERATE_PDF
  return {
    id: numericTemplateId,
    id_template: numericTemplateId,
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
