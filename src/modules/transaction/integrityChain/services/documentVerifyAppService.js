'use strict'

/**
 * Application services for public / authenticated document QR verify flows.
 * Keeps integrityChainController free of repository access.
 */

const transactionRepository =
  require('../../transaction/repositories/transactionRepository')
const {
  verifyDocumentQr
} = require('./integrityChainService')
const {
  buildDocumentQrScanBundle
} = require('./documentQrScanBundleService')
const {
  issueDocumentDetailsCode,
  resolveDocumentDetailsCode
} = require('./documentDetailsCodeService')
const {
  buildPublicVerifyResult
} = require('../views/documentVerifyPublicView')

function createDocumentVerifyError (message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function verifyDocumentPublicScan (source = {}) {
  const result = await verifyDocumentQr({
    transactionId: source.tx,
    genesisHash: source.g,
    documentInstanceId: source.doc,
    signatureBase64Url: source.s
  })

  const transaction = result.transaction_id
    ? await transactionRepository.findById(result.transaction_id)
    : null

  const detailsMeta =
    result.valid && transaction
      ? await issueDocumentDetailsCode(transaction.id)
      : null

  return buildPublicVerifyResult(result, transaction, detailsMeta)
}

async function getDocumentVerifyDetailsByTransactionId (transactionId) {
  const numericId = Number.parseInt(transactionId, 10)

  if (!Number.isInteger(numericId) || numericId < 1) {
    throw createDocumentVerifyError('معرّف المعاملة غير صالح', 400)
  }

  const transaction = await transactionRepository.findById(numericId)

  if (!transaction) {
    throw createDocumentVerifyError('المعاملة غير موجودة', 404)
  }

  return buildDocumentQrScanBundle(transaction)
}

async function getDocumentVerifyDetailsByCode (code) {
  const { transactionId } = await resolveDocumentDetailsCode(code)
  return getDocumentVerifyDetailsByTransactionId(transactionId)
}

module.exports = {
  verifyDocumentPublicScan,
  getDocumentVerifyDetailsByTransactionId,
  getDocumentVerifyDetailsByCode
}
