'use strict'

const transactionRepository = require('../repositories/transactionRepository')
const transactionSignatureLinkRepository =
  require('../repositories/transactionSignatureLinkRepository')
const stageRepository = require('../../workflow/repositories/stageRepository')

const {
  INTEGRITY_CHAIN_VERSION,
  buildGenesisHash,
  computeStageDataHash,
  computeCumulativeHashForTransactionData,
  computeCumulativeHashFromStages,
  computeLinkHash,
  verifySignatureValue,
  buildQrPayload,
  extractStageEntries
} = require('./integrityChainUtils')

async function ensureGenesisHash (transactionLike) {
  const transaction = typeof transactionLike?.update === 'function'
    ? transactionLike
    : await transactionRepository.findById(transactionLike.id)

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

  await transaction.update({ genesis_hash: genesisHash })

  return genesisHash
}

async function getPreviousLinkHash (transactionId) {
  const latestLink =
    await transactionSignatureLinkRepository.findLatestByTransactionId(transactionId)

  return latestLink?.link_hash || null
}

async function resolveStageOrder (processDefinitionId, stageId) {
  const stages = await stageRepository.findByProcessId(processDefinitionId)

  if (!Array.isArray(stages) || !stages.length) {
    return 0
  }

  const index = stages.findIndex(stage => stage.id === stageId)

  return index >= 0 ? index + 1 : 0
}

async function createIntegrityLink ({
  transactionLike,
  processDefinitionId,
  stage,
  stageSnapshot,
  mergedTransactionData,
  challenge,
  digitalSignature,
  userKey,
  signedMessage
}) {
  const transaction = typeof transactionLike?.update === 'function'
    ? transactionLike
    : await transactionRepository.findById(transactionLike.id)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const genesisHash = await ensureGenesisHash(transaction)
  const previousLinkHash = await getPreviousLinkHash(transaction.id)
  const linkOrder =
    (await transactionSignatureLinkRepository.countByTransactionId(transaction.id)) + 1

  const stageDataHash = computeStageDataHash(stageSnapshot)
  const cumulativeHash = computeCumulativeHashForTransactionData(mergedTransactionData)
  const stageOrder = await resolveStageOrder(processDefinitionId, stage.id)
  const signedAt = digitalSignature.signed_at || new Date()

  const linkHash = computeLinkHash({
    linkOrder,
    transactionId: transaction.id,
    stageId: stage.id,
    stageCode: stage.code,
    stageDataHash,
    cumulativeHash,
    previousLinkHash,
    genesisHash,
    userId: challenge.user_id,
    signedAt
  })

  return transactionSignatureLinkRepository.create({
    transaction_id: transaction.id,
    digital_signature_id: digitalSignature.id,
    link_order: linkOrder,
    stage_id: stage.id,
    stage_code: stage.code,
    stage_order: stageOrder,
    stage_data_hash: stageDataHash,
    cumulative_hash: cumulativeHash,
    previous_link_hash: previousLinkHash,
    link_hash: linkHash,
    genesis_hash: genesisHash,
    challenge_id: challenge.id,
    signed_message: signedMessage,
    user_id: challenge.user_id,
    user_key_id: userKey.id,
    signed_at: signedAt
  })
}

async function getIntegrityChain (transactionId) {
  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  const links =
    await transactionSignatureLinkRepository.findAllByTransactionId(transactionId)

  const verification = await verifyIntegrityChain(transactionId)

  const headHash = links.length
    ? links[links.length - 1].cumulative_hash
    : transaction.genesis_hash || null

  const chainStatus = !links.length
    ? 'incomplete'
    : verification.valid
      ? 'valid'
      : 'forged'

  return {
    transaction_id: transaction.id,
    transaction_status: transaction.status,
    genesis_hash: transaction.genesis_hash || null,
    schema_version: INTEGRITY_CHAIN_VERSION,
    chain_status: chainStatus,
    total_links: links.length,
    head_hash: headHash,
    qr_payload: buildQrPayload({
      transactionId: transaction.id,
      genesisHash: transaction.genesis_hash || null,
      headHash,
      totalLinks: links.length,
      chainStatus
    }),
    links: links.map(link => ({
      order: link.link_order,
      stage_id: link.stage_id,
      stage_code: link.stage_code,
      stage_order: link.stage_order,
      stage_data_hash: link.stage_data_hash,
      cumulative_hash: link.cumulative_hash,
      previous_link_hash: link.previous_link_hash,
      link_hash: link.link_hash,
      challenge_id: link.challenge_id,
      signer: {
        user_id: link.user_id,
        user_name: link.user?.userName || null,
        key_fingerprint: link.user_key?.key_fingerprint || null
      },
      signed_at: link.signed_at,
      verification: verification.failed_at_link === link.link_order
        ? verification.reason
        : 'valid'
    })),
    last_verification: verification
  }
}

async function verifyIntegrityChain (transactionId, options = {}) {
  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (!transaction.genesis_hash) {
    return {
      valid: false,
      reason: 'INCOMPLETE',
      message: 'لم تُنشأ genesis_hash بعد — المعاملة لم تُقدَّم أو لم يُوقَّع عليها',
      failed_at_link: null,
      data: null
    }
  }

  const links =
    await transactionSignatureLinkRepository.findAllByTransactionId(transactionId)

  if (!links.length) {
    return {
      valid: transaction.status === 'draft',
      reason: transaction.status === 'draft' ? 'INCOMPLETE' : 'NO_SIGNATURES',
      message: transaction.status === 'draft'
        ? 'المعاملة مسودة — لا توقيعات بعد'
        : 'لا توجد توقيعات مسجلة لهذه المعاملة',
      failed_at_link: null,
      data: {
        genesis_hash: transaction.genesis_hash,
        total_links: 0
      }
    }
  }

  let previousLinkHash = null

  for (const link of links) {
    if (link.genesis_hash !== transaction.genesis_hash) {
      return failVerify(link.link_order, 'GENESIS_MISMATCH', 'genesis_hash لا يطابق المعاملة', {
        expected: transaction.genesis_hash,
        found: link.genesis_hash
      })
    }

    if ((link.previous_link_hash || null) !== (previousLinkHash || null)) {
      return failVerify(link.link_order, 'CHAIN_BROKEN', 'previous_link_hash مكسور — سلسلة مُعدَّلة', {
        expected_previous_link_hash: previousLinkHash,
        found_previous_link_hash: link.previous_link_hash
      })
    }

    const recomputedLinkHash = computeLinkHash({
      linkOrder: link.link_order,
      transactionId: link.transaction_id,
      stageId: link.stage_id,
      stageCode: link.stage_code,
      stageDataHash: link.stage_data_hash,
      cumulativeHash: link.cumulative_hash,
      previousLinkHash: link.previous_link_hash,
      genesisHash: link.genesis_hash,
      userId: link.user_id,
      signedAt: link.signed_at
    })

    if (recomputedLinkHash !== link.link_hash) {
      return failVerify(link.link_order, 'LINK_HASH_MISMATCH', 'link_hash غير متطابق — حلقة مُعدَّلة', {
        expected_link_hash: recomputedLinkHash,
        found_link_hash: link.link_hash
      })
    }

    const stageData = transaction.data?.[link.stage_code]

    if (!stageData) {
      return failVerify(link.link_order, 'STAGE_DATA_MISSING', 'بيانات المرحلة غير موجودة في المعاملة', {
        stage_code: link.stage_code
      })
    }

    const recomputedStageHash = computeStageDataHash(stageData)

    if (recomputedStageHash !== link.stage_data_hash) {
      return failVerify(link.link_order, 'HASH_MISMATCH', 'بيانات المرحلة تغيّرت بعد التوقيع', {
        stage_code: link.stage_code,
        expected_stage_data_hash: link.stage_data_hash,
        found_stage_data_hash: recomputedStageHash
      })
    }

    const signedStageCodes = links
      .filter(item => item.link_order <= link.link_order)
      .map(item => item.stage_code)
      .sort()

    const entriesUntilLink = signedStageCodes.map(code => ({
      stage_code: code,
      stage_data: transaction.data[code]
    }))

    const recomputedCumulative = computeCumulativeHashFromStages(entriesUntilLink)

    if (recomputedCumulative !== link.cumulative_hash) {
      return failVerify(link.link_order, 'CUMULATIVE_HASH_MISMATCH', 'cumulative_hash لا يطابق بيانات المعاملة', {
        expected_cumulative_hash: link.cumulative_hash,
        found_cumulative_hash: recomputedCumulative
      })
    }

    const signatureValue = link.digital_signature?.signature_value

    if (!signatureValue || !link.user_key?.public_key) {
      return failVerify(link.link_order, 'SIGNATURE_MISSING', 'التوقيع الرقمي غير موجود')
    }

    const signatureValid = verifySignatureValue({
      publicKeyPem: link.user_key.public_key,
      message: link.signed_message,
      signatureBase64: signatureValue
    })

    if (!signatureValid) {
      return failVerify(link.link_order, 'SIGNATURE_INVALID', 'التوقيع الرقمي غير صحيح — المعاملة مزورة', {
        stage_code: link.stage_code,
        challenge_id: link.challenge_id
      })
    }

    previousLinkHash = link.link_hash
  }

  const headHash = links[links.length - 1].cumulative_hash
  const liveCumulative = computeCumulativeHashForTransactionData(transaction.data)

  return {
    valid: true,
    reason: 'VALID',
    message: 'المعاملة أصلية — سلسلة التواقيع سليمة',
    failed_at_link: null,
    data: {
      transaction_id: transaction.id,
      genesis_hash: transaction.genesis_hash,
      head_hash: headHash,
      live_cumulative_hash: liveCumulative,
      total_links: links.length,
      chain_matches_live_data: headHash === liveCumulative
    }
  }
}

function failVerify (failedAtLink, reason, message, details = {}) {
  return {
    valid: false,
    reason,
    message,
    failed_at_link: failedAtLink,
    data: details
  }
}

module.exports = {
  ensureGenesisHash,
  getPreviousLinkHash,
  createIntegrityLink,
  getIntegrityChain,
  verifyIntegrityChain
}
