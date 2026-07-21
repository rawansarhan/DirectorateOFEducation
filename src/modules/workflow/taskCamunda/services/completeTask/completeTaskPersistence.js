'use strict'

const processInstanceRepository = require('../../repositories/processInstanceRepository')
const transactionRepository =
  require('../../../../transaction/transaction/repositories/transactionRepository')
const {
  persistVerifiedSignature,
  appendSignatureToTransactionData
} = require('../transactionSigningService')
const { appendIntegrityLink } =
  require('../../../../transaction/integrityChain/services/integrityChainService')
const { createProcessStage } =
  require('../../../../transaction/process_instance_stage/services/processInstanceStageService')
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
  let digitalSignatureRecord = null
  let nextVersion = currentVersion
  const sequelize = processInstanceRepository.getSequelize()
  const stagePersistenceStatus = isReject ? 'rejected' : 'completed'

  logStep('PHASE_12_16_DB_TRANSACTION', {
    transactionId: transaction.id,
    stageCode: stage.code,
    status: stagePersistenceStatus
  })

  await withDbTransaction(sequelize, dbTransaction, async (dbTx) => {
    if (signingRequest) {
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
    } else {
      logStep('PHASE_12_SKIP_SIGNATURE_PERSIST', { reason: 'no_signing_request' })
    }

    logStep('PHASE_14_SAVE_TRANSACTION_DATA', {
      transactionId: transaction.id,
      version: nextVersion
    })

    const updatedTransaction = await transactionRepository.updateDataOptimistic(
      transaction.id,
      transactionData,
      nextVersion,
      dbTx
    )

    nextVersion = updatedTransaction.version

    logStep('TRANSACTION_DATA_SAVED', {
      transactionId: transaction.id,
      version: nextVersion
    })

    if (digitalSignatureRecord) {
      logStep('PHASE_15_APPEND_INTEGRITY_LINK')

      await appendIntegrityLink({
        transactionId: transaction.id,
        digitalSignatureId: digitalSignatureRecord.digital_signature_id,
        challengeId: signingRequest?.challengeId || null,
        stageId: stage.id,
        stageCode: stage.code,
        stageData: persistAuthSubmissionAtRoot
          ? buildRootSubmissionSnapshot(transactionData)
          : transactionData[stage.code],
        signatureHash: digitalSignatureRecord.signed_hash,
        signedAt: digitalSignatureRecord.signed_at,
        dbTransaction: dbTx
      })

      logStep('INTEGRITY_LINK_APPENDED')
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
      assigned_to: userId
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
