'use strict'

const transactionRepository = require('../../transaction/repositories/transactionRepository')
const documentInstanceRepository = require('../repositories/documentInstanceRepository')
const documentSignatureRepository =
  require('../../../workflow/taskCamunda/repositories/documentSignatureRepository')
const { API_PUBLIC_URL } = require('../../../../core/config/env')
const {
  isAuthorityKeyConfigured,
  signDocumentBinding
} = require('../../integrityChain/services/authoritySignatureService')
const { buildVerificationUrl } = require('./qrStampService')
const {
  toTransactionDocumentsDTO,
  toFinalQrDTO
} = require('../mappers/documentMapper')

function buildFinalQr ({ transaction, generatedInstances }) {
  if (!generatedInstances.length) {
    return toFinalQrDTO({
      available: false,
      message: 'لم يتم توليد أي نسخة PDF لهذه المعاملة بعد'
    })
  }

  if (!transaction.genesis_hash) {
    return toFinalQrDTO({
      available: false,
      message: 'لم تبدأ سلسلة التواقيع لهذه المعاملة بعد'
    })
  }

  if (!isAuthorityKeyConfigured()) {
    return toFinalQrDTO({
      available: false,
      message: 'مفتاح سلطة الإصدار غير مهيّأ على الخادم'
    })
  }

  const finalInstance = generatedInstances[generatedInstances.length - 1]

  const signature = signDocumentBinding({
    transactionId: transaction.id,
    genesisHash: transaction.genesis_hash,
    documentInstanceId: finalInstance.id
  })

  const verificationUrl = buildVerificationUrl({
    apiBaseUrl: API_PUBLIC_URL,
    transactionId: transaction.id,
    genesisHash: transaction.genesis_hash,
    documentInstanceId: finalInstance.id,
    signatureBase64Url: signature
  })

  return toFinalQrDTO({
    available: true,
    transaction_id: transaction.id,
    genesis_hash: transaction.genesis_hash,
    document_instance_id: finalInstance.id,
    content_hash: finalInstance.content_hash ?? null,
    signature,
    verification_url: verificationUrl
  })
}

async function getTransactionDocuments (transactionId, { userId = null } = {}) {
  const numericTransactionId = Number.parseInt(transactionId, 10)

  if (!Number.isInteger(numericTransactionId) || numericTransactionId < 1) {
    throw new Error('معرّف المعاملة غير صالح')
  }

  const transaction = await transactionRepository.findById(numericTransactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (userId && transaction.user_id !== userId) {
    throw new Error('Unauthorized access')
  }

  const [instances, uploadedRows] = await Promise.all([
    documentInstanceRepository.findAllByTransactionId(numericTransactionId),
    documentSignatureRepository.findAllWithSignaturesByTransactionId(
      numericTransactionId
    )
  ])

  const generatedInstances = instances.filter(item => item.generated_pdf_path)

  return toTransactionDocumentsDTO({
    transaction_id: transaction.id,
    status: transaction.status,
    generated_documents: generatedInstances,
    uploaded_files: uploadedRows,
    final_qr: buildFinalQr({ transaction, generatedInstances })
  })
}

module.exports = {
  getTransactionDocuments
}
