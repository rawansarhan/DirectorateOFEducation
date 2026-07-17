'use strict'

/**
 * =============================================================================
 * transactionDocumentsService — تجميع كل وثائق المعاملة
 * =============================================================================
 *
 * يُرجِع لمعاملة واحدة:
 *   - generated_documents : كل ملفات GENERATE_PDF (document_instance.generated_pdf_path)
 *   - uploaded_files      : كل ملفات file_picker المرفوعة (document_signature)
 *   - final_qr            : رمز QR النهائي للمعاملة وفق الطريقة المعتمدة
 *                           (توقيع سلطة الإصدار على tx|genesis|doc — مؤشّر حيّ للسلسلة)
 */

const transactionRepository = require('../../transaction/repositories/transactionRepository')
const documentInstanceRepository = require('../repositories/documentInstanceRepository')
const documentSignatureRepository =
  require('../../../workflow/taskCamunda/repositories/documentSignatureRepository')
const {
  normalizeStoredFilePath,
  toPublicFileUrl,
  isSyntheticSignatureDocumentPath
} = require('../../../../core/utils/filePath')
const { API_PUBLIC_URL } = require('../../../../core/config/env')
const {
  isAuthorityKeyConfigured,
  signDocumentBinding
} = require('../../integrityChain/services/authoritySignatureService')
const { buildVerificationUrl } = require('./qrStampService')

function mapGeneratedDocument (instance) {
  const storedPath = normalizeStoredFilePath(instance.generated_pdf_path)

  return {
    document_instance_id: instance.id,
    document_template_id: instance.document_template_id,
    file_path: storedPath,
    file_url: toPublicFileUrl(instance.generated_pdf_path),
    content_hash: instance.content_hash ?? null,
    status: instance.status,
    generated_at: instance.updated_at ?? instance.created_at ?? null
  }
}

function mapUploadedFile (row) {
  if (isSyntheticSignatureDocumentPath(row.file_path)) {
    return null
  }

  const storedPath = normalizeStoredFilePath(row.file_path)

  if (!storedPath) {
    return null
  }

  return {
    document_id: row.id,
    file_path: storedPath,
    file_url: toPublicFileUrl(row.file_path),
    type_doc_id: row.type_doc_id ?? null,
    type_doc: row.type_doc
      ? { id: row.type_doc.id, name: row.type_doc.name }
      : null,
    type_doc_name: row.type_doc?.name ?? null,
    signatures_count: Array.isArray(row.signatures) ? row.signatures.length : 0,
    uploaded_at: row.created_at ?? null
  }
}

/**
 * يبني رمز QR النهائي للمعاملة مرتبطاً بآخر نسخة PDF مولّدة (المؤشّر الحيّ للسلسلة).
 * يعيد available=false مع سبب واضح إذا تعذّر بناؤه.
 */
function buildFinalQr ({ transaction, generatedInstances }) {
  if (!generatedInstances.length) {
    return {
      available: false,
      message: 'لم يتم توليد أي نسخة PDF لهذه المعاملة بعد'
    }
  }

  if (!transaction.genesis_hash) {
    return {
      available: false,
      message: 'لم تبدأ سلسلة التواقيع لهذه المعاملة بعد'
    }
  }

  if (!isAuthorityKeyConfigured()) {
    return {
      available: false,
      message: 'مفتاح سلطة الإصدار غير مهيّأ على الخادم'
    }
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

  return {
    available: true,
    transaction_id: transaction.id,
    genesis_hash: transaction.genesis_hash,
    document_instance_id: finalInstance.id,
    content_hash: finalInstance.content_hash ?? null,
    signature,
    verification_url: verificationUrl
  }
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

  return {
    transaction_id: transaction.id,
    status: transaction.status,
    generated_documents: generatedInstances.map(mapGeneratedDocument),
    uploaded_files: uploadedRows.map(mapUploadedFile).filter(Boolean),
    final_qr: buildFinalQr({ transaction, generatedInstances })
  }
}

module.exports = {
  getTransactionDocuments
}
