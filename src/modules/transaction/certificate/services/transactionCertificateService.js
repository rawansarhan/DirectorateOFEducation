'use strict'

const transactionRepository = require('../../transaction/repositories/transactionRepository')
const processRepository = require('../../../workflow/processDefinition/repositories/processRepository')
const documentInstanceRepository = require('../../document/repositories/documentInstanceRepository')
const documentFinalTransactionRepository = require('../repositories/documentFinalTransactionRepository')
const { getIntegrityChain } = require('../../integrityChain/services/integrityChainService')
const { formatTransactionHistoryForDisplay, enrichHistoryTemplatesWithDocumentInstances } = require('../../../workflow/taskCamunda/utils/transactionHistoryDisplay')
const {
  normalizeProcessPriority,
  formatTransactionDate
} = require('../../../workflow/taskCamunda/utils/employeeTaskFormatters')
const { createTransactionError } = require('../../transaction/utils/transactionErrors')
const employeeTaskRepository = require('../../../workflow/taskCamunda/repositories/employeeTaskRepository')

const COMPLETED_STATUSES = new Set(['completed'])
const CERTIFICATE_AUDIENCE = {
  OWNER: 'owner',
  EMPLOYEE: 'employee'
}

function mapFinalDocument (row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    file_path: row.file_path,
    file_url: row.file_path,
    original_name: row.original_name,
    mime_type: row.mime_type,
    file_size_bytes: row.file_size_bytes,
    generated_at: row.generated_at,
    qr_payload_snapshot: row.qr_payload_snapshot ?? null
  }
}

async function employeeCanAccessCertificate (userId, transaction) {
  const roleIds = await employeeTaskRepository.getUserRoleIds(userId)

  if (!roleIds.length) {
    return false
  }

  const process = transaction.code
    ? await processRepository.findByCode(transaction.code)
    : null

  if (!process) {
    return false
  }

  const { processDefinitionIds } =
    await employeeTaskRepository.getAccessibleStageContext(roleIds)

  return processDefinitionIds.includes(process.id)
}

async function loadAuthorizedTransaction (
  transactionId,
  userId,
  { audience = CERTIFICATE_AUDIENCE.OWNER } = {}
) {
  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  if (!userId) {
    return transaction
  }

  if (transaction.user_id === userId) {
    return transaction
  }
//تحقق من صلاحية الموظف
  if (audience === CERTIFICATE_AUDIENCE.EMPLOYEE) {
    const allowed = await employeeCanAccessCertificate(userId, transaction)

    if (allowed) {
      return transaction
    }

    throw createTransactionError(
      'UNAUTHORIZED',
      'لا تملك صلاحية عرض شهادة هذه المعاملة'
    )
  }

  throw createTransactionError('UNAUTHORIZED')
}

async function getCertificateBundle (
  transactionId,
  { userId = null, audience = CERTIFICATE_AUDIENCE.OWNER } = {}
) {
  const transaction = await loadAuthorizedTransaction(transactionId, userId, {
    audience
  })

  if (!COMPLETED_STATUSES.has(transaction.status)) {
    throw createTransactionError(
      'VALIDATION_ERROR',
      'الشهادة متاحة فقط للمعاملات المكتملة (completed)'
    )
  }

  const [process, documentInstances, finalDocument] =
    await Promise.all([
      transaction.code
        ? processRepository.findByCode(transaction.code)
        : null,
      documentInstanceRepository.findAllByTransactionId(transactionId),
      documentFinalTransactionRepository.findByTransactionIdCached(transactionId)
    ])

  const historyData = enrichHistoryTemplatesWithDocumentInstances(
    formatTransactionHistoryForDisplay(transaction.data || {}, transaction),
    documentInstances
  )

  // الشهادة لا تتضمّن أي بيانات QR — نُسقط qr_payload_snapshot من الوثيقة النهائية
  const mappedFinalDocument = mapFinalDocument(finalDocument)

  if (mappedFinalDocument) {
    delete mappedFinalDocument.qr_payload_snapshot
  }

  const finalDocumentResult = mappedFinalDocument || {
    available: false,
    message: 'لم يتم توليد نسخة pdf من هذا الطلب'
  }

  return {
    transaction_id: transaction.id,
    status: transaction.status,
    process_name: process?.name ?? null,
    process_priority: normalizeProcessPriority(process?.priority),
    submitted_at: formatTransactionDate(transaction.created_at),
    completed_at: formatTransactionDate(transaction.updated_at),
    transaction_history: {
      id_process: transaction.id_process ?? null,
      priority: normalizeProcessPriority(process?.priority),
      data: historyData
    },
    final_document: finalDocumentResult
  }
}

async function saveFinalDocument ({
  transactionId,
  userId,
  file,
  qrPayloadSnapshot = null
}) {
  const transaction = await loadAuthorizedTransaction(transactionId, userId)

  if (!COMPLETED_STATUSES.has(transaction.status)) {
    throw createTransactionError(
      'VALIDATION_ERROR',
      'لا يمكن حفظ الوثيقة النهائية إلا لمعاملة مكتملة (completed)'
    )
  }

  if (!file) {
    throw createTransactionError('VALIDATION_ERROR', 'الملف PDF مطلوب')
  }

  const filePath = `/uploads/${file.filename}`
  let qrSnapshot = qrPayloadSnapshot

  if (!qrSnapshot) {
    const chain = await getIntegrityChain(transactionId, { userId })
    qrSnapshot = chain.qr_payload ?? null
  }

  const saved = await documentFinalTransactionRepository.upsertForTransaction({
    transactionId: transaction.id,
    filePath,
    originalName: file.originalname,
    mimeType: file.mimetype || 'application/pdf',
    fileSizeBytes: file.size ?? null,
    qrPayloadSnapshot: qrSnapshot,
    generatedByUserId: userId,
    generatedAt: new Date()
  })

  return mapFinalDocument(saved)
}
//جلب الوثيقة النهائية 
async function getFinalDocument (transactionId, { userId = null } = {}) {
  //تحقق من صلاحية المعاملة 
  await loadAuthorizedTransaction(transactionId, userId)

  const row = await documentFinalTransactionRepository.findByTransactionIdCached(
    transactionId
  )

  if (!row) {
    throw createTransactionError(
      'NOT_FOUND',
      'لا توجد وثيقة نهائية محفوظة لهذه المعاملة'
    )
  }

  return mapFinalDocument(row)
}

module.exports = {
  CERTIFICATE_AUDIENCE,
  getCertificateBundle,
  saveFinalDocument,
  getFinalDocument
}
