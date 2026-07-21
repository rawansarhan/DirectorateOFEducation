'use strict'

const fs = require('fs')
const path = require('path')

const transactionRepository = require('../../transaction/repositories/transactionRepository')
const documentInstanceRepository = require('../../document/repositories/documentInstanceRepository')
const documentSignatureRepository =
  require('../../../workflow/public').documentSignatureRepository
const transactionSignatureLinkRepository =
  require('../../integrityChain/repositories/transactionSignatureLinkRepository')
const {
  findGeneratePdfEventsByTransactionId,
  flushGeneratePdfForTransaction
} = require('../../../../core/shared/outbox/services/generatePdfOutboxService')
const {
  isAuthorityKeyConfigured
} = require('../../integrityChain/services/authoritySignatureService')
const { createTransactionError } = require('../../transaction/utils/transactionErrors')
const {
  normalizeStoredFilePath,
  resolveAbsoluteUploadPath,
  isSyntheticSignatureDocumentPath
} = require('../../../../core/utils/filePath')
const {
  loadAuthorizedTransaction,
  CERTIFICATE_AUDIENCE
} = require('./transactionCertificateService')

const COMPLETED_STATUS = 'completed'

function fileExistsOnDisk (storedPath) {
  const normalized = normalizeStoredFilePath(storedPath)

  if (!normalized) {
    return false
  }

  try {
    return fs.existsSync(resolveAbsoluteUploadPath(normalized))
  } catch {
    return false
  }
}

function buildCheck ({ id, ok, message, details = null }) {
  return {
    id,
    ok,
    message,
    ...(details ? { details } : {})
  }
}

function summarizeGeneratePdfInstances (instances = []) {
  return instances.map(instance => ({
    id: instance.id,
    template_id: instance.document_template_id,
    generated_pdf_path: instance.generated_pdf_path,
    file_on_disk: instance.generated_pdf_path
      ? fileExistsOnDisk(instance.generated_pdf_path)
      : false,
    status: instance.status
  }))
}

function summarizeOutboxEvents (events = []) {
  return events.map(event => ({
    id: event.id,
    status: event.status,
    last_error: event.last_error,
    retry_count: Number(event.payload?._retry_count || 0),
    template_id: event.payload?.template_id ?? null,
    created_at: event.created_at,
    processed_at: event.processed_at
  }))
}

function summarizeUploadedFiles (rows = []) {
  return rows
    .filter(row => !isSyntheticSignatureDocumentPath(row.file_path))
    .map(row => {
      const normalized = normalizeStoredFilePath(row.file_path)

      return {
        id: row.id,
        file_path: normalized,
        file_on_disk: fileExistsOnDisk(normalized),
        type_doc_id: row.type_doc_id
      }
    })
}

async function assessFinalDocumentReadiness (
  transactionId,
  {
    userId = null,
    requireCompleted = true,
    flushGeneratePdf = false,
    requireOwner = false
  } = {}
) {
  const numericTransactionId = Number.parseInt(transactionId, 10)

  if (!Number.isInteger(numericTransactionId) || numericTransactionId < 1) {
    throw createTransactionError('VALIDATION_ERROR', 'معرّف المعاملة غير صالح')
  }

  let flushResults = []

  if (flushGeneratePdf) {
    flushResults = await flushGeneratePdfForTransaction(numericTransactionId)
  }

  const transaction = requireOwner
    ? await loadAuthorizedTransaction(numericTransactionId, userId, {
      audience: CERTIFICATE_AUDIENCE.OWNER
    })
    : await transactionRepository.findById(numericTransactionId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  const [instances, uploadedRows, signatureLinks, outboxEvents] = await Promise.all([
    documentInstanceRepository.findAllByTransactionId(numericTransactionId),
    documentSignatureRepository.findAllWithSignaturesByTransactionId(
      numericTransactionId
    ),
    transactionSignatureLinkRepository.findByTransactionIdOrdered(
      numericTransactionId
    ),
    findGeneratePdfEventsByTransactionId(numericTransactionId, [
      'pending',
      'failed'
    ])
  ])
  const instanceSummaries = summarizeGeneratePdfInstances(instances)
  const uploadedSummaries = summarizeUploadedFiles(uploadedRows)
  const outboxSummaries = summarizeOutboxEvents(outboxEvents)

  const instancesMissingPdf = instanceSummaries.filter(
    item => !item.generated_pdf_path
  )
  const instancesMissingFile = instanceSummaries.filter(
    item => item.generated_pdf_path && !item.file_on_disk
  )
  const uploadsMissingFile = uploadedSummaries.filter(item => !item.file_on_disk)
  const failedOutbox = outboxSummaries.filter(item => item.status === 'failed')
  const pendingOutbox = outboxSummaries.filter(item => item.status === 'pending')

  const generatePdfRequired =
    outboxSummaries.length > 0 ||
    instanceSummaries.some(item => item.generated_pdf_path)

  const generatePdfReady =
    !generatePdfRequired ||
    (
      instancesMissingPdf.length === 0 &&
      instancesMissingFile.length === 0 &&
      failedOutbox.length === 0 &&
      pendingOutbox.length === 0
    )

  const authorityConfigured = isAuthorityKeyConfigured()
  const finalQrReady =
    generatePdfReady &&
    Boolean(transaction.genesis_hash) &&
    authorityConfigured &&
    instanceSummaries.some(item => item.generated_pdf_path && item.file_on_disk)

  const checks = [
    buildCheck({
      id: 'transaction_completed',
      ok: !requireCompleted || transaction.status === COMPLETED_STATUS,
      message:
        transaction.status === COMPLETED_STATUS
          ? 'المعاملة مكتملة'
          : `حالة المعاملة: ${transaction.status} — الدمج النهائي يتطلب completed`
    }),
    buildCheck({
      id: 'documents_available',
      ok: instances.length > 0 || uploadedRows.length > 0,
      message:
        instances.length > 0 || uploadedRows.length > 0
          ? 'توجد وثائق للدمج'
          : 'لا توجد وثائق (GENERATE_PDF أو مرفقات) لهذه المعاملة'
    }),
    buildCheck({
      id: 'generate_pdf',
      ok: generatePdfReady,
      message: generatePdfReady
        ? 'كل ملفات GENERATE_PDF جاهزة'
        : 'ملفات GENERATE_PDF غير جاهزة بعد',
      details: {
        required: generatePdfRequired,
        missing_paths: instancesMissingPdf,
        missing_files: instancesMissingFile,
        outbox_pending: pendingOutbox,
        outbox_failed: failedOutbox
      }
    }),
    buildCheck({
      id: 'uploaded_files',
      ok: uploadsMissingFile.length === 0,
      message: uploadsMissingFile.length === 0
        ? 'كل المرفقات موجودة على القرص'
        : 'بعض المرفقات غير موجودة على القرص',
      details: {
        missing: uploadsMissingFile
      }
    }),
    buildCheck({
      id: 'integrity_chain',
      ok: Boolean(transaction.genesis_hash) && signatureLinks.length > 0,
      message:
        transaction.genesis_hash && signatureLinks.length > 0
          ? `سلسلة التواقيع موجودة (${signatureLinks.length} رابط)`
          : 'سلسلة التواقيع غير مكتملة أو genesis_hash مفقود'
    }),
    buildCheck({
      id: 'authority_keys',
      ok: authorityConfigured,
      message: authorityConfigured
        ? 'مفاتيح سلطة الإصدار مهيّأة'
        : 'INTEGRITY_AUTHORITY_PRIVATE_KEY غير مضبوط على السيرفر'
    }),
    buildCheck({
      id: 'final_qr',
      ok: finalQrReady,
      message: finalQrReady
        ? 'يمكن تضمين رمز QR على غلاف الدمج'
        : 'رمز QR على الغلاف غير متاح بعد'
    })
  ]

  const blockingIssues = checks
    .filter(check => !check.ok && [
      'transaction_completed',
      'documents_available',
      'generate_pdf',
      'uploaded_files'
    ].includes(check.id))
    .map(check => check.message)

  if (failedOutbox.length) {
    const lastError = failedOutbox[failedOutbox.length - 1].last_error
    if (lastError && !blockingIssues.includes(lastError)) {
      blockingIssues.push(`فشل GENERATE_PDF: ${lastError}`)
    }
  }

  const readyForMerge = blockingIssues.length === 0

  return {
    transaction_id: numericTransactionId,
    transaction_status: transaction.status,
    ready_for_merge: readyForMerge,
    ready_for_completion: generatePdfReady,
    checks,
    blocking_issues: blockingIssues,
    generate_pdf: {
      required: generatePdfRequired,
      ready: generatePdfReady,
      instances: instanceSummaries,
      outbox_events: outboxSummaries,
      flush_results: flushResults
    },
    uploaded_files: uploadedSummaries,
    integrity_chain: {
      genesis_hash: transaction.genesis_hash,
      total_links: signatureLinks.length
    },
    final_qr: {
      ready: finalQrReady,
      authority_configured: authorityConfigured
    }
  }
}

function assertReadyForMerge (readiness) {
  if (readiness?.ready_for_merge) {
    return
  }

  const issues = readiness?.blocking_issues || ['الوثيقة النهائية غير جاهزة للدمج']

  throw createTransactionError(
    'FINAL_DOCUMENT_NOT_READY',
    issues.join(' — '),
    { details: readiness }
  )
}

function assertReadyForWorkflowCompletion (readiness) {
  if (readiness?.ready_for_completion) {
    return
  }

  const issues = readiness?.blocking_issues?.length
    ? readiness.blocking_issues
    : ['توليد PDF لم يكتمل بعد']

  const err = createTransactionError(
    'GENERATE_PDF_NOT_READY',
    issues.join(' — '),
    { details: readiness?.generate_pdf || null }
  )

  err.statusCode = 409

  throw err
}

module.exports = {
  assessFinalDocumentReadiness,
  assertReadyForMerge,
  assertReadyForWorkflowCompletion
}
