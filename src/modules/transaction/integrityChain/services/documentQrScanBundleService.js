'use strict'

/**
 * تجميع بيانات مسح QR العامة بعد نجاح verifyDocumentQr:
 * موقّعون + طالب المعاملة + تواريخ + final_document + transaction_history
 */

const processRepository = require('../../../workflow/processDefinition/repositories/processRepository')
const documentInstanceRepository = require('../../document/repositories/documentInstanceRepository')
const documentFinalTransactionRepository =
  require('../../certificate/repositories/documentFinalTransactionRepository')
const transactionSignatureLinkRepository =
  require('../repositories/transactionSignatureLinkRepository')
const {
  formatTransactionHistoryForDisplay,
  enrichHistoryTemplatesWithDocumentInstances
} = require('../../../workflow/taskCamunda/utils/transactionHistoryDisplay')
const {
  normalizeProcessPriority,
  formatTransactionDate
} = require('../../../workflow/taskCamunda/utils/employeeTaskFormatters')
const {
  toIdentityPersonDTO,
  toSignerDTO,
  toFinalDocumentPublicDTO,
  toDocumentQrScanBundleDTO
} = require('../mappers/integrityChainMapper')

function resolveStatusDates (transaction) {
  const status = transaction.status
  const updatedAt = formatTransactionDate(transaction.updated_at)

  return {
    request_date: formatTransactionDate(transaction.created_at),
    completed_at: status === 'completed' ? updatedAt : null,
    rejected_at: status === 'rejected' ? updatedAt : null
  }
}

/**
 * يبني حمولة عامة غنية لمسح QR — يُستدعى فقط بعد التحقق من صحة التوقيع/السلسلة.
 */
async function buildDocumentQrScanBundle (transaction) {
  if (!transaction) {
    return null
  }

  const transactionId = transaction.id

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

  const historyData = enrichHistoryTemplatesWithDocumentInstances(
    formatTransactionHistoryForDisplay(transaction.data || {}, transaction),
    documentInstances
  )

  const dates = resolveStatusDates(transaction)

  return toDocumentQrScanBundleDTO({
    transaction: {
      id: transaction.id,
      id_process: transaction.id_process ?? null,
      status: transaction.status,
      process_name: process?.name ?? null,
      request_date: dates.request_date,
      completed_at: dates.completed_at,
      rejected_at: dates.rejected_at
    },
    applicant: toIdentityPersonDTO(transaction),
    signers: (signerLinks || []).map(toSignerDTO),
    transaction_history: {
      id_process: transaction.id_process ?? null,
      priority: normalizeProcessPriority(process?.priority),
      data: historyData
    },
    final_document: toFinalDocumentPublicDTO(finalDocument)
  })
}

module.exports = {
  buildDocumentQrScanBundle
}
