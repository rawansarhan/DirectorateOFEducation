'use strict'

const processInstanceRepository = require('../../repositories/processInstanceRepository')
const {
  appendIntegrityLink,
  createProcessStage
} = require('../../../../transaction/public')
const {
  persistVerifiedSignature,
  appendSignatureToTransactionData
} = require('../transactionSigningService')
const transactionSigningChallengeRepository =
  require('../../repositories/transactionSigningChallengeRepository')
const {
  computeStageDataHash
} = require('../../../../transaction/integrityChain/utils/integrityChainUtils')
const { toPublicSignatureRecord } = require('../../mappers/completeTaskMapper')
const securityGuardService = require('../../../../../core/security/securityGuardService')
const {
  buildRootSubmissionSnapshot,
  enrichTemplatesForResponse,
  withDbTransaction,
  logStep
} = require('./completeTaskHelpers')

async function persistCompleteTaskSideEffects ({
  signingRequest,
  digitalSignatureRecord: prePersistedSignature = null,
  clientMeta,
  userId,
  task,
  stage,
  transaction,
  transactionData,
  currentVersion,
  persistAuthSubmissionAtRoot,
  isReject,
  stageSnapshot,
  dbTransaction = null
}) {
  let digitalSignatureRecord = prePersistedSignature
  let nextVersion = currentVersion
  const sequelize = processInstanceRepository.getSequelize()
  const stagePersistenceStatus = isReject ? 'rejected' : 'completed'

  logStep('PHASE_12_16_DB_TRANSACTION', {
    transactionId: transaction.id,
    stageCode: stage.code,
    status: stagePersistenceStatus
  })

  await withDbTransaction(sequelize, dbTransaction, async (dbTx) => {
    // إن حُفظ التوقيع قبل Camunda — لا نعيد الحفظ هنا
    if (signingRequest && !digitalSignatureRecord) {
      logStep('PHASE_12_PERSIST_SIGNATURE', {
        challengeId: signingRequest.challengeId
      })

      digitalSignatureRecord = await persistVerifiedSignature({
        challengeId: signingRequest.challengeId,
        signature: signingRequest.signature,
        userId,
        clientMeta,
        dbTransaction: dbTx
      })

      stageSnapshot.digital_signature =
        toPublicSignatureRecord(digitalSignatureRecord)

      appendSignatureToTransactionData(transactionData, digitalSignatureRecord)

      logStep('SIGNATURE_PERSISTED', {
        digitalSignatureId: digitalSignatureRecord.digital_signature_id
      })
    } else if (signingRequest && digitalSignatureRecord) {
      logStep('PHASE_12_SIGNATURE_ALREADY_PERSISTED', {
        digitalSignatureId: digitalSignatureRecord.digital_signature_id
      })

      if (!stageSnapshot.digital_signature) {
        stageSnapshot.digital_signature =
          toPublicSignatureRecord(digitalSignatureRecord)
      }

      appendSignatureToTransactionData(transactionData, digitalSignatureRecord)
    } else {
      logStep('PHASE_12_SKIP_SIGNATURE_PERSIST', { reason: 'no_signing_request' })
    }

    logStep('PHASE_14_SAVE_TRANSACTION_DATA', {
      transactionId: transaction.id,
      version: nextVersion
    })

    const {
      persistOptimisticWithConflictRetry
    } = require('./completeOptimisticPersist')

    const updatedTransaction = await persistOptimisticWithConflictRetry({
      transactionId: transaction.id,
      expectedVersion: nextVersion,
      transactionData,
      dbTransaction: dbTx
    })

    nextVersion = updatedTransaction.version
    transactionData = updatedTransaction.transactionData

    logStep('TRANSACTION_DATA_SAVED', {
      transactionId: transaction.id,
      version: nextVersion,
      conflictRetried: Boolean(updatedTransaction.conflictRetried)
    })

    if (digitalSignatureRecord) {
      logStep('PHASE_15_APPEND_INTEGRITY_LINK')

      const stageRecord = persistAuthSubmissionAtRoot
        ? buildRootSubmissionSnapshot(transactionData)
        : transactionData[stage.code]

      let signedStageHash = null

      if (signingRequest?.challengeId) {
        const challenge = await transactionSigningChallengeRepository.findById(
          signingRequest.challengeId
        )
        signedStageHash = challenge?.stage_data_hash || null
      }

      const stageDataHash = signedStageHash || computeStageDataHash(stageRecord)

      await appendIntegrityLink({
        transactionId: transaction.id,
        digitalSignatureId: digitalSignatureRecord.digital_signature_id,
        challengeId: signingRequest?.challengeId || null,
        stageId: stage.id,
        stageCode: stage.code,
        stageData: stageRecord,
        stageDataHash,
        signatureHash: digitalSignatureRecord.signed_hash,
        signedAt: digitalSignatureRecord.signed_at,
        dbTransaction: dbTx
      })

      logStep('INTEGRITY_LINK_APPENDED', { stageDataHash })
    }

    logStep('PHASE_16_CREATE_PROCESS_STAGE', { status: stagePersistenceStatus })

    const processStageData = persistAuthSubmissionAtRoot
      ? buildRootSubmissionSnapshot(transactionData)
      : transactionData[stage.code]

    await createProcessStage({
      transactionId: transaction.id,
      stageCode: stage.code,
      stageName: stage.name,
      status: stagePersistenceStatus,
      data: processStageData,
      assigned_to: userId,
      contentHash: computeStageDataHash(processStageData),
      challengeId: signingRequest?.challengeId || null,
      sealed: true
    }, { transaction: dbTx })

    logStep('PROCESS_STAGE_CREATED', { status: stagePersistenceStatus })
  })

  if (signingRequest && digitalSignatureRecord) {
    await securityGuardService.recordSuccess({
      userId,
      action: 'TX_SIGN_VERIFIED',
      resourceType: 'task',
      resourceId: task.id,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: {
        signingId: signingRequest.challengeId,
        digitalSignatureId: digitalSignatureRecord.digital_signature_id,
        stageCode: stage.code
      }
    })
  }

  const responseTemplates = await enrichTemplatesForResponse(stageSnapshot.templates)

  return {
    digitalSignatureRecord,
    currentVersion: nextVersion,
    responseTemplates,
    sequelize
  }
}

module.exports = {
  persistCompleteTaskSideEffects
}
