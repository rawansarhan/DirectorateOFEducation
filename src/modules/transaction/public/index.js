'use strict'

/**
 * Public port — transaction bounded context.
 *
 * Other modules (workflow, notification, …) must import from here only.
 * Do not reach into internal transaction repositories or services directly.
 *
 * Getters keep requires lazy to avoid cycles with workflow/public.
 */

module.exports = {
  // ── Persistence ─────────────────────────────────────────────
  get transactionRepository () {
    return require('../transaction/repositories/transactionRepository')
  },
  get documentInstanceRepository () {
    return require('../document/repositories/documentInstanceRepository')
  },

  // ── Validations / utils ─────────────────────────────────────
  get parsePositiveInt () {
    return require('../transaction/validations/transactionValidations')
      .parsePositiveInt
  },
  get validateDraftFormAgainstConfig () {
    return require('../transaction/validations/draftFormValidation')
      .validateDraftFormAgainstConfig
  },
  get validateWidgetValue () {
    return require('../transaction/validations/draftFormValidation')
      .validateWidgetValue
  },

  // ── Application services ────────────────────────────────────
  get submitTransaction () {
    return require('../transaction/services/transactionSubmitService')
      .submitTransaction
  },
  get ensureDraftForProcess () {
    return require('../transaction/services/transactionDraftService')
      .ensureDraftForProcess
  },
  get generateMergedFinalDocument () {
    return require('../certificate/services/finalDocumentBuilderService')
      .generateMergedFinalDocument
  },
  get assessFinalDocumentReadiness () {
    return require('../certificate/services/finalDocumentReadinessService')
      .assessFinalDocumentReadiness
  },
  get assertReadyForWorkflowCompletion () {
    return require('../certificate/services/finalDocumentReadinessService')
      .assertReadyForWorkflowCompletion
  },
  get getCertificateBundle () {
    return require('../certificate/services/transactionCertificateService')
      .getCertificateBundle
  },
  get registerTransactionFiles () {
    return require('../document/services/documentFileService')
      .registerTransactionFiles
  },
  get registerTemplatesForTransaction () {
    return require('../document/services/documentInstanceService')
      .registerTemplatesForTransaction
  },
  get fillTemplatePdfDocument () {
    return require('../document/services/pdfGenerationService')
      .fillTemplatePdfDocument
  },
  get persistFilledPdfDocument () {
    return require('../document/services/pdfGenerationService')
      .persistFilledPdfDocument
  },
  get ensureGenesisHash () {
    return require('../integrityChain/services/integrityChainService')
      .ensureGenesisHash
  },
  get appendIntegrityLink () {
    return require('../integrityChain/services/integrityChainService')
      .appendIntegrityLink
  },
  get createProcessStage () {
    return require('../process_instance_stage/services/processInstanceStageService')
      .createProcessStage
  },

  // ── Internal application API (replaces transactionClient in-process) ─
  get getTransactionById () {
    return require('../transaction/services/transactionInternalService').getById
  },
  get updateTransactionStatus () {
    return require('../transaction/services/transactionInternalService')
      .updateStatus
  },
  get updateTransactionData () {
    return require('../transaction/services/transactionInternalService')
      .updateData
  }
}
