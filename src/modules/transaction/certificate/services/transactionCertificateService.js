'use strict'

const transactionRepository = require('../../transaction/repositories/transactionRepository')
const {
  processRepository,
  stageRepository,
  employeeTaskRepository,
  formatTransactionHistoryForDisplay,
  enrichHistoryTemplatesWithDocumentInstances,
  normalizeProcessPriority,
  formatTransactionDate
} = require('../../../workflow/public')
const documentInstanceRepository = require('../../document/repositories/documentInstanceRepository')
const documentFinalTransactionRepository = require('../repositories/documentFinalTransactionRepository')
const transactionSignatureLinkRepository =
  require('../../integrityChain/repositories/transactionSignatureLinkRepository')
const { getIntegrityChain } = require('../../integrityChain/services/integrityChainService')
const { createTransactionError } = require('../../transaction/utils/transactionErrors')
const {
  toFinalDocumentDTO,
  toCertificateSignerDTO,
  toCertificateBundleDTO,
  toSaveFinalDocumentInput
} = require('../mappers/certificateMapper')
const { toPublicFileUrl } = require('../../../../core/utils/filePath')
const { paginateArray } = require('../../../../core/utils/pagination')

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

async function buildStageNamesByCode (processDefinitionId) {
  if (!processDefinitionId) {
    return new Map()
  }

  const stages = await stageRepository.findByProcessDefinitionId(
    processDefinitionId
  )

  return new Map(
    (stages || [])
      .filter(stage => stage.code)
      .map(stage => [stage.code, stage.name ?? null])
  )
}

async function getCertificateBundle (
  transactionId,
  { userId: _userId = null, audience: _audience = CERTIFICATE_AUDIENCE.OWNER } = {}
) {
  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  const [process, documentInstances, finalDocument, signerLinks] =
    await Promise.all([
      transaction.code
        ? processRepository.findByCode(transaction.code)
        : null,
      documentInstanceRepository.findAllByTransactionId(transactionId),
      documentFinalTransactionRepository.findByTransactionIdCached(transactionId),
      transactionSignatureLinkRepository.findSignersWithIdentityByTransactionId(
        transactionId
      )
    ])

  const stageNamesByCode = await buildStageNamesByCode(process?.id ?? null)

  const historyData = enrichHistoryTemplatesWithDocumentInstances(
    formatTransactionHistoryForDisplay(transaction.data || {}, transaction),
    documentInstances
  )

  const isCompleted = COMPLETED_STATUSES.has(transaction.status)

  return toCertificateBundleDTO({
    transaction_id: transaction.id,
    status: transaction.status,
    process_name: process?.name ?? null,
    process_priority: normalizeProcessPriority(process?.priority),
    submitted_at: formatTransactionDate(transaction.created_at),
    completed_at: isCompleted
      ? formatTransactionDate(transaction.updated_at)
      : null,
    signers: (signerLinks || []).map(link =>
      toCertificateSignerDTO(link, { stageNamesByCode })
    ),
    transaction_history: {
      process_name: process?.name ?? null,
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
  const numericTransactionId = Number.parseInt(transactionId, 10)

  if (!Number.isInteger(numericTransactionId) || numericTransactionId < 1) {
    throw createTransactionError('VALIDATION_ERROR', 'معرّف المعاملة غير صالح')
  }

  const transaction = await transactionRepository.findById(numericTransactionId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  let row = await documentFinalTransactionRepository.findByTransactionIdCached(
    numericTransactionId
  )

  const snapshot = row?.qr_payload_snapshot || {}
  const missingQr =
    Boolean(row) &&
    !snapshot.verification_url &&
    !snapshot.signature

  const shouldGenerate =
    COMPLETED_STATUSES.has(transaction.status) &&
    (!row || missingQr)

  if (shouldGenerate) {
    const {
      generateMergedFinalDocument
    } = require('./finalDocumentBuilderService')

    try {
      await generateMergedFinalDocument(numericTransactionId, {
        userId,
        force: Boolean(missingQr),
        requireOwner: false
      })

      row = await documentFinalTransactionRepository.findByTransactionIdCached(
        numericTransactionId
      )
    } catch (error) {
      // إن فشلت إعادة التوليد وما زالت نسخة قديمة موجودة نُعيدها
      if (!row) {
        throw error
      }
    }
  }

  if (!row) {
    throw createTransactionError(
      'NOT_FOUND',
      'لا توجد وثيقة نهائية محفوظة لهذه المعاملة'
    )
  }

  return toFinalDocumentDTO(row, { includeQrSnapshot: true })
}

async function deleteFinalDocument (transactionId) {
  const numericTransactionId = Number.parseInt(transactionId, 10)

  if (!Number.isInteger(numericTransactionId) || numericTransactionId < 1) {
    throw createTransactionError('VALIDATION_ERROR', 'معرّف المعاملة غير صالح')
  }

  const transaction = await transactionRepository.findById(numericTransactionId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  const deleted = await documentFinalTransactionRepository.deleteByTransactionId(
    numericTransactionId
  )

  if (!deleted) {
    throw createTransactionError(
      'NOT_FOUND',
      'لا توجد وثيقة نهائية محفوظة لهذه المعاملة'
    )
  }

  return {
    transaction_id: numericTransactionId,
    deleted: true,
    final_document_id: deleted.id ?? null,
    file_path: deleted.file_path ?? null
  }
}

async function listMyFinalDocuments (userId, paginationInput = {}) {
  if (!userId) {
    throw createTransactionError('UNAUTHORIZED')
  }

  const rows = await documentFinalTransactionRepository.findAllByOwnerUserId(
    userId
  )

  const items = (rows || []).map(row => {
    const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row
    const transaction = plain.transaction || {}

    return {
      id: plain.id,
      transaction_id: plain.transaction_id,
      file_path: plain.file_path,
      file_url: toPublicFileUrl(plain.file_path),
      original_name: plain.original_name,
      mime_type: plain.mime_type,
      file_size_bytes: plain.file_size_bytes,
      generated_at: plain.generated_at,
      transaction: {
        id: transaction.id ?? plain.transaction_id,
        id_process: transaction.id_process ?? null,
        code: transaction.code ?? null,
        status: transaction.status ?? null
      }
    }
  })

  const { items: pageItems, pagination } = paginateArray(items, paginationInput)

  return {
    items: pageItems,
    pagination
  }
}

module.exports = {
  CERTIFICATE_AUDIENCE,
  loadAuthorizedTransaction,
  getCertificateBundle,
  saveFinalDocument,
  getFinalDocument,
  deleteFinalDocument,
  listMyFinalDocuments
}
