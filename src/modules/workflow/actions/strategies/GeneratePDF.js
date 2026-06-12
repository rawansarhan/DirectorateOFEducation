'use strict'

/**
 * =============================================================================
 * GeneratePDF — action strategy لمرحلة SERVICE_TASK
 * =============================================================================
 *
 * يُعرّف في stage_config.config_json.actions:
 *   { name: "GENERATE_PDF", payload: { template_id: 1 } }
 *
 * يُنفَّذ تلقائياً عند complete لـ SERVICE_TASK (completeTaskService Phase 9)
 *
 * المتطلبات:
 *   - document_instance موجود مسبقاً (أُنشئ من templates في USER_TASK)
 *   - document_template نشط وملف PDF موجود في uploads
 *
 * النتيجة: generated_pdf_path محدّث في document_instance
 */

const documentInstanceRepository = require('../../../transaction/document/repositories/documentInstanceRepository')
const documentTemplateRepository = require('../../../requirements/DocTemp/repositories/documentTemplateRepository')
const {
  generatePdfFromTemplate
} = require('../../../transaction/document/services/pdfGenerationService')

class GeneratePdfStrategy {
  async execute ({ payload, context }) {
    const templateId = Number(payload?.template_id)
    const transactionId = context?.transaction?.id

    if (!Number.isInteger(templateId) || templateId <= 0) {
      throw new Error('GENERATE_PDF payload.template_id مطلوب')
    }

    if (!transactionId) {
      throw new Error('GENERATE_PDF: transaction غير موجود في السياق')
    }

    // document_instance أُنشئ عند complete USER_TASK مع templates[].values
    const documentInstance =
      await documentInstanceRepository.findByTransactionAndTemplate(
        transactionId,
        templateId
      )

    if (!documentInstance) {
      throw new Error(
        `document_instance غير موجود — أرسل templates[{ id: ${templateId}, values: {...} }] في USER_TASK أولاً`
      )
    }

    const documentTemplate = await documentTemplateRepository.findOneActiveById(
      templateId
    )

    if (!documentTemplate) {
      throw new Error(
        `قالب الوثيقة (template_id=${templateId}) غير موجود أو غير نشط`
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
      template_id: templateId,
      document_instance_id: documentInstance.id,
      transaction_id: transactionId,
      generated_pdf_path: generation.generated_pdf_path,
      filled_keys: generation.filled_keys,
      skipped_keys: generation.skipped_keys,
      values_used: generation.values_used,
      engine_type: documentTemplate.engine_type
    }
  }
}

module.exports = GeneratePdfStrategy
