'use strict'

const transactionRepository = require('../../transaction/repositories/transactionRepository')
const processRepository = require('../../../workflow/processDefinition/repositories/processRepository')
const documentInstanceRepository = require('../../document/repositories/documentInstanceRepository')
const documentFinalTransactionRepository = require('../repositories/documentFinalTransactionRepository')
const { getIntegrityChain } = require('../../integrityChain/services/integrityChainService')
const {
  formatTransactionHistoryForDisplay,
  enrichHistoryTemplatesWithDocumentInstances
} = require('../../../workflow/taskCamunda/utils/transactionHistoryDisplay')
const {
  normalizeProcessPriority,
  formatTransactionDate
} = require('../../../workflow/taskCamunda/utils/employeeTaskFormatters')
const { createTransactionError } = require('../../transaction/utils/transactionErrors')
const employeeTaskRepository = require('../../../workflow/taskCamunda/repositories/employeeTaskRepository')
const {
  toFinalDocumentDTO,
  toCertificateBundleDTO,
  toSaveFinalDocumentInput
} = require('../mappers/certificateMapper')

const COMPLETED_STATUSES = new Set(['completed'])
const CERTIFICATE_AUDIENCE = {
  OWNER: 'owner',
  EMPLOYEE: 'employee'
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
  { userId: _userId = null, audience: _audience = CERTIFICATE_AUDIENCE.OWNER } = {}
) {
  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

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

  return toCertificateBundleDTO({
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
    final_document: finalDocument
  })
}

async function saveFinalDocument (payload) {
  const input = toSaveFinalDocumentInput(payload)
  const transaction = await loadAuthorizedTransaction(
    input.transactionId,
    input.userId
  )

  if (!COMPLETED_STATUSES.has(transaction.status)) {
    throw createTransactionError(
      'VALIDATION_ERROR',
      'لا يمكن حفظ الوثيقة النهائية إلا لمعاملة مكتملة (completed)'
    )
  }

  if (!input.file) {
    throw createTransactionError('VALIDATION_ERROR', 'الملف PDF مطلوب')
  }

  const filePath = `/uploads/${input.file.filename}`
  let qrSnapshot = input.qrPayloadSnapshot

  if (!qrSnapshot) {
    const chain = await getIntegrityChain(input.transactionId, {
      userId: input.userId
    })
    qrSnapshot = chain.qr_payload ?? null
  }

  const saved = await documentFinalTransactionRepository.upsertForTransaction({
    transactionId: transaction.id,
    filePath,
    originalName: input.file.originalname,
    mimeType: input.file.mimetype || 'application/pdf',
    fileSizeBytes: input.file.size ?? null,
    qrPayloadSnapshot: qrSnapshot,
    generatedByUserId: input.userId,
    generatedAt: new Date()
  })

  return toFinalDocumentDTO(saved, { includeQrSnapshot: true })
}

async function getFinalDocument (transactionId, { userId = null } = {}) {
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

  return toFinalDocumentDTO(row, { includeQrSnapshot: true })
}

module.exports = {
  CERTIFICATE_AUDIENCE,
  getCertificateBundle,
  saveFinalDocument,
  getFinalDocument
}
