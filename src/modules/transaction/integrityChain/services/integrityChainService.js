'use strict'

const transactionRepository =
  require('../../transaction/repositories/transactionRepository')
const transactionSignatureLinkRepository =
  require('../repositories/transactionSignatureLinkRepository')
const documentInstanceRepository =
  require('../../document/repositories/documentInstanceRepository')
const digitalSignatureRepository =
  require('../../../workflow/taskCamunda/repositories/digitalSignatureRepository')
const transactionSigningChallengeRepository =
  require('../../../workflow/taskCamunda/repositories/transactionSigningChallengeRepository')
const {
  verifyDocumentBinding
} = require('./authoritySignatureService')

const { API_PUBLIC_URL } = require('../../../../core/config/env')
const {
  INTEGRITY_CHAIN_VERSION,
  buildGenesisHash,
  computeStageDataHash,
  computeCumulativeHash,
  computeLinkHash,
  buildQrPayload,
  verifySignatureValue,
  resolveStageDataForIntegrity
} = require('../utils/integrityChainUtils')
const {
  toVerifyResultDTO,
  toIntegrityChainDTO,
  toDocumentQrVerifyDTO
} = require('../mappers/integrityChainMapper')

async function ensureGenesisHash (transactionLike, { transaction: dbTransaction } = {}) {
  const transaction = typeof transactionLike?.update === 'function'
    ? transactionLike
    : await transactionRepository.findById(transactionLike.id, dbTransaction)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.genesis_hash) {
    return transaction.genesis_hash
  }

  const genesisHash = buildGenesisHash({
    transactionId: transaction.id,
    processCode: transaction.code,
    createdAt: transaction.created_at
  })

  await transaction.update({ genesis_hash: genesisHash }, { transaction: dbTransaction })

  return genesisHash
}

async function getPreviousLinkHash (transactionId) {
  const latest =
    await transactionSignatureLinkRepository.findLatestByTransactionId(
      transactionId
    )

  return latest?.link_hash || null
}

async function appendIntegrityLink ({
  transactionId,
  digitalSignatureId,
  challengeId = null,
  stageId = null,
  stageCode = null,
  stageData = {},
  signatureHash,
  signedAt = new Date(),
  dbTransaction = null
}) {
  const transaction = await transactionRepository.findById(transactionId, dbTransaction)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const genesisHash = await ensureGenesisHash(transaction, { transaction: dbTransaction })
  const previousLink = await transactionSignatureLinkRepository
    .findLatestByTransactionId(transactionId)

  const signatureOrder = (previousLink?.signature_order || 0) + 1
  const stageDataHash = computeStageDataHash(stageData)
  const cumulativeHash = computeCumulativeHash({
    genesisHash,
    previousCumulativeHash: previousLink?.cumulative_hash || null,
    stageDataHash
  })
  const linkHash = computeLinkHash({
    cumulativeHash,
    signatureHash,
    signatureOrder
  })

  return transactionSignatureLinkRepository.create({
    transaction_id: transactionId,
    digital_signature_id: digitalSignatureId,
    challenge_id: challengeId,
    stage_id: stageId,
    stage_code: stageCode,
    signature_order: signatureOrder,
    stage_data_hash: stageDataHash,
    cumulative_hash: cumulativeHash,
    link_hash: linkHash,
    previous_link_hash: previousLink?.link_hash || null,
    genesis_hash: genesisHash,
    signed_at: signedAt
  }, dbTransaction ? { transaction: dbTransaction } : {})
}

async function verifyLinksCryptographically (transactionId, links = []) {
  const signatures =
    await digitalSignatureRepository.findAllByTransactionIdOrdered(
      transactionId
    )

  const signatureById = new Map(
    signatures.map(signature => [signature.id, signature])
  )

  const issues = []

  for (const link of links) {
    const signature = signatureById.get(link.digital_signature_id)

    if (!signature) {
      issues.push(`missing digital signature for link #${link.signature_order}`)
      continue
    }

    const challenge = link.challenge_id
      ? await transactionSigningChallengeRepository.findById(link.challenge_id)
      : await transactionSigningChallengeRepository.findUsedByMessageHash(
        signature.signed_hash,
        transactionId
      )

    if (!challenge?.message) {
      issues.push(`missing signing challenge for link #${link.signature_order}`)
      continue
    }

    const publicKey = signature.user_key?.public_key

    if (!publicKey) {
      issues.push(`missing public key for link #${link.signature_order}`)
      continue
    }

    const valid = verifySignatureValue({
      publicKeyPem: publicKey,
      message: challenge.message,
      signatureBase64: signature.signature_value
    })

    if (!valid) {
      issues.push(`invalid Ed25519 signature for link #${link.signature_order}`)
    }
  }

  return issues
}

function verifyLinkChainStructure (transaction, links = []) {
  const issues = []

  if (!transaction.genesis_hash) {
    issues.push('genesis_hash is missing')
    return { valid: false, issues }
  }

  const expectedGenesis = buildGenesisHash({
    transactionId: transaction.id,
    processCode: transaction.code,
    createdAt: transaction.created_at
  })

  if (transaction.genesis_hash !== expectedGenesis) {
    issues.push('genesis_hash does not match transaction metadata')
  }

  let previousLinkHash = null
  let previousCumulativeHash = null

  for (const link of links) {
    if (link.genesis_hash !== transaction.genesis_hash) {
      issues.push(`genesis mismatch at link #${link.signature_order}`)
    }

    if (link.previous_link_hash !== previousLinkHash) {
      issues.push(`broken chain at link #${link.signature_order}`)
    }

    const stageDataHash = computeStageDataHash(
      resolveStageDataForIntegrity(transaction.data, link.stage_code)
    )

    if (stageDataHash !== link.stage_data_hash) {
      issues.push(`stage data hash mismatch at link #${link.signature_order}`)
    }

    const expectedCumulativeHash = computeCumulativeHash({
      genesisHash: transaction.genesis_hash,
      previousCumulativeHash: previousCumulativeHash,
      stageDataHash: link.stage_data_hash
    })

    if (expectedCumulativeHash !== link.cumulative_hash) {
      issues.push(`cumulative hash mismatch at link #${link.signature_order}`)
    }

    previousLinkHash = link.link_hash
    previousCumulativeHash = link.cumulative_hash
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

async function verifyIntegrityChain (transactionId, hints = {}) {
  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const links = await transactionSignatureLinkRepository
    .findByTransactionIdOrdered(transactionId)

  const structure = verifyLinkChainStructure(transaction, links)
  const cryptoIssues = await verifyLinksCryptographically(transactionId, links)
  const issues = [...structure.issues, ...cryptoIssues]

  const headHash = links.length
    ? links[links.length - 1].cumulative_hash
    : null

  if (hints.head_hash && headHash && hints.head_hash !== headHash) {
    issues.push('head_hash does not match current chain head')
  }

  if (hints.genesis_hash && transaction.genesis_hash &&
    hints.genesis_hash !== transaction.genesis_hash) {
    issues.push('genesis_hash does not match transaction genesis')
  }

  const valid = issues.length === 0 && links.length > 0

  return toVerifyResultDTO({
    transaction_id: transaction.id,
    transaction_status: transaction.status,
    genesis_hash: transaction.genesis_hash,
    schema_version: INTEGRITY_CHAIN_VERSION,
    chain_status: links.length === 0
      ? 'incomplete'
      : (valid ? 'valid' : 'forged'),
    total_links: links.length,
    head_hash: headHash,
    valid,
    issues,
    verified_at: new Date()
  })
}

async function getIntegrityChain (transactionId, { userId = null, skipOwnerCheck = false } = {}) {
  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    throw new Error('الطلب غير موجود')
  }

  if (!skipOwnerCheck && userId && transaction.user_id !== userId) {
    throw new Error('Unauthorized access')
  }

  const links = await transactionSignatureLinkRepository
    .findByTransactionIdOrdered(transactionId)

  const lastVerification = await verifyIntegrityChain(transactionId)

  const headHash = links.length
    ? links[links.length - 1].cumulative_hash
    : null

  return toIntegrityChainDTO({
    transaction_id: transaction.id,
    transaction_status: transaction.status,
    genesis_hash: transaction.genesis_hash,
    schema_version: INTEGRITY_CHAIN_VERSION,
    chain_status: lastVerification.chain_status,
    total_links: links.length,
    head_hash: headHash,
    qr_payload: buildQrPayload({
      transactionId: transaction.id,
      genesisHash: transaction.genesis_hash,
      headHash,
      totalLinks: links.length,
      apiBaseUrl: API_PUBLIC_URL
    }),
    links,
    last_verification: lastVerification
  })
}

/**
 * تحقق عام من رمز QR في وثيقة PDF (يُستدعى من /api/verify/document).
 *
 * يتحقق من:
 *   1) صحة توقيع سلطة الإصدار على ربط الوثيقة (tx|genesis|doc).
 *   2) تطابق genesis_hash مع المعاملة.
 *   3) أن نسخة الوثيقة تخص هذه المعاملة فعلاً.
 *   4) سلامة سلسلة التواقيع الحالية (المؤشّر الحيّ — أحدث سلسلة كاملة).
 *
 * يعيد content_hash المسجّل ليطابقه الماسح مع الملف الذي بحوزته.
 */
async function verifyDocumentQr ({
  transactionId,
  genesisHash,
  documentInstanceId,
  signatureBase64Url
}) {
  const numericTransactionId = Number.parseInt(transactionId, 10)
  const numericDocumentInstanceId = Number.parseInt(documentInstanceId, 10)

  if (!Number.isInteger(numericTransactionId) || numericTransactionId < 1) {
    throw new Error('معرّف المعاملة غير صالح')
  }

  if (!Number.isInteger(numericDocumentInstanceId) || numericDocumentInstanceId < 1) {
    throw new Error('معرّف الوثيقة غير صالح')
  }

  if (!genesisHash || !signatureBase64Url) {
    throw new Error('بيانات رمز QR ناقصة')
  }

  const signatureValid = verifyDocumentBinding({
    transactionId: numericTransactionId,
    genesisHash,
    documentInstanceId: numericDocumentInstanceId,
    signatureBase64Url
  })

  if (!signatureValid) {
    return toDocumentQrVerifyDTO({
      valid: false,
      signature_valid: false,
      reason: 'توقيع سلطة الإصدار غير صالح — قد يكون رمز QR مزوّراً',
      verified_at: new Date()
    })
  }

  const transaction = await transactionRepository.findById(numericTransactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.genesis_hash !== genesisHash) {
    return toDocumentQrVerifyDTO({
      valid: false,
      signature_valid: true,
      reason: 'genesis_hash لا يطابق المعاملة',
      verified_at: new Date()
    })
  }

  const documentInstance = await documentInstanceRepository.findById(
    numericDocumentInstanceId
  )

  if (!documentInstance || documentInstance.transaction_id !== numericTransactionId) {
    return toDocumentQrVerifyDTO({
      valid: false,
      signature_valid: true,
      reason: 'نسخة الوثيقة لا تخص هذه المعاملة',
      verified_at: new Date()
    })
  }

  const chain = await verifyIntegrityChain(numericTransactionId, { genesis_hash: genesisHash })

  return toDocumentQrVerifyDTO({
    valid: chain.valid,
    signature_valid: true,
    transaction_id: numericTransactionId,
    transaction_status: transaction.status,
    genesis_hash: transaction.genesis_hash,
    document: {
      document_instance_id: documentInstance.id,
      document_template_id: documentInstance.document_template_id,
      generated_pdf_path: documentInstance.generated_pdf_path,
      content_hash: documentInstance.content_hash,
      status: documentInstance.status
    },
    chain,
    verified_at: new Date()
  })
}

module.exports = {
  ensureGenesisHash,
  getPreviousLinkHash,
  appendIntegrityLink,
  getIntegrityChain,
  verifyIntegrityChain,
  verifyDocumentQr
}
