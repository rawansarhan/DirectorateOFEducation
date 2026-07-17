'use strict'

/**
 * =============================================================================
 * GeneratePDF — action strategy لمرحلة SERVICE_TASK
 * =============================================================================
 *
 * يُنفَّذ توليد PDF **متزامناً** أولاً؛ عند الفشل يُenqueue في outbox لإعادة المحاولة.
 * document_instance يُنشأ فقط داخل executeGeneratePdfJob بعد نجاح الملء/الحفظ.
 */

const documentTemplateRepository = require('../../../requirements/DocTemp/repositories/documentTemplateRepository')
const documentInstanceRepository = require('../../../transaction/document/repositories/documentInstanceRepository')
const { enqueueOutboxEvent } = require('../../../../core/shared/outbox/services/outboxEnqueueService')
const {
  executeGeneratePdfJob
} = require('../services/generatePdfJobService')
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

    const documentTemplate = await documentTemplateRepository.findById(
      templateId
    )

    if (!documentTemplate) {
      throw new Error(
        `قالب الوثيقة (template_id=${templateId}) غير موجود`
      )
    }

    const existingInstance =
      await documentInstanceRepository.findByTransactionAndTemplate(
        transactionId,
        templateId
      )

    if (existingInstance?.generated_pdf_path) {
      return {
        type: 'pdf',
        status: 'generated',
        skipped: true,
        template_id: templateId,
        document_instance_id: existingInstance.id,
        transaction_id: transactionId,
        generated_pdf_path: existingInstance.generated_pdf_path,
        engine_type: documentTemplate.engine_type
      }
    }

    const jobPayload = {
      transaction_id: transactionId,
      template_id: templateId,
      document_instance_id: existingInstance?.id || null,
      stage_code: context?.stage?.code || null,
      user_id: context?.userId || null
    }

    try {
      const result = await executeGeneratePdfJob(jobPayload)

      return {
        type: 'pdf',
        status: 'generated',
        skipped: Boolean(result.skipped),
        template_id: templateId,
        document_instance_id: result.document_instance_id,
        transaction_id: transactionId,
        generated_pdf_path: result.generated_pdf_path,
        engine_type: documentTemplate.engine_type
      }
    } catch (error) {
      await enqueueOutboxEvent(EVENTS.GENERATE_PDF, jobPayload)

      return {
        type: 'pdf',
        status: 'queued',
        queued_after_failure: true,
        error: error.message,
        template_id: templateId,
        document_instance_id: null,
        transaction_id: transactionId,
        generated_pdf_path: null,
        engine_type: documentTemplate.engine_type
      }
    }
  }
}

module.exports = GeneratePdfStrategy
