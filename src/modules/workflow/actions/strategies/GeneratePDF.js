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
 * التنفيذ: يُ enqueue في outbox — التوليد الفعلي في generatePdf.listener.js
 */

const documentInstanceRepository = require('../../../transaction/document/repositories/documentInstanceRepository')
const documentTemplateRepository = require('../../../requirements/DocTemp/repositories/documentTemplateRepository')
const { enqueueOutboxEvent } = require('../../../../core/shared/outbox/services/outboxEnqueueService')
const EVENTS = require('../../../../core/shared/events/types')

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

    if (documentInstance.generated_pdf_path) {
      return {
        type: 'pdf',
        status: 'generated',
        skipped: true,
        template_id: templateId,
        document_instance_id: documentInstance.id,
        transaction_id: transactionId,
        generated_pdf_path: documentInstance.generated_pdf_path,
        engine_type: documentTemplate.engine_type
      }
    }

    await enqueueOutboxEvent(EVENTS.GENERATE_PDF, {
      transaction_id: transactionId,
      template_id: templateId,
      document_instance_id: documentInstance.id,
      stage_code: context?.stage?.code || null,
      user_id: context?.userId || null
    })

    return {
      type: 'pdf',
      status: 'queued',
      template_id: templateId,
      document_instance_id: documentInstance.id,
      transaction_id: transactionId,
      generated_pdf_path: null,
      engine_type: documentTemplate.engine_type
    }
  }
}

module.exports = GeneratePdfStrategy
