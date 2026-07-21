'use strict'

/**
 * Public port — workflow bounded context.
 *
 * Other modules (transaction, …) must import from here only.
 * Do not reach into internal workflow repositories or services directly.
 *
 * Getters keep requires lazy to avoid cycles with transaction/public.
 */

module.exports = {
  // ── Persistence ─────────────────────────────────────────────
  get processRepository () {
    return require('../processDefinition/repositories/processRepository')
  },
  get stageRepository () {
    return require('../processDefinition/repositories/stageRepository')
  },
  get employeeTaskRepository () {
    return require('../taskCamunda/repositories/employeeTaskRepository')
  },
  get documentSignatureRepository () {
    return require('../taskCamunda/repositories/documentSignatureRepository')
  },
  get digitalSignatureRepository () {
    return require('../taskCamunda/repositories/digitalSignatureRepository')
  },
  get transactionSigningChallengeRepository () {
    return require('../taskCamunda/repositories/transactionSigningChallengeRepository')
  },

  // ── Application services ────────────────────────────────────
  get startWorkflow () {
    return require('../taskCamunda/services/startWorkflowService').startWorkflow
  },
  get validateSubmitTransactionRequest () {
    return require('../services/stageSubmissionService')
      .validateSubmitTransactionRequest
  },
  get buildStoredStageData () {
    return require('../services/stageSubmissionService').buildStoredStageData
  },
  get buildStoredSubmissionData () {
    return require('../services/stageSubmissionService')
      .buildStoredSubmissionData
  },
  get loadAuthStageByProcessCode () {
    return require('../services/stageSubmissionService')
      .loadAuthStageByProcessCode
  },
  get loadAuthStageConfigByProcessCode () {
    return require('../services/stageSubmissionService')
      .loadAuthStageConfigByProcessCode
  },
  get verifySignatureForComplete () {
    return require('../taskCamunda/services/transactionSigningService')
      .verifySignatureForComplete
  },
  get persistVerifiedSignature () {
    return require('../taskCamunda/services/transactionSigningService')
      .persistVerifiedSignature
  },
  get buildDraftSubmitTaskId () {
    return require('../taskCamunda/services/transactionSigningService')
      .buildDraftSubmitTaskId
  },
  get createDraftSubmitSigningChallenge () {
    return require('../taskCamunda/services/transactionSigningService')
      .createDraftSubmitSigningChallenge
  },

  // ── Stage form / config (shared with transaction drafts) ────
  get WIDGET_TYPES () {
    return require('../stageConfig/validations/stageConfigSchema').WIDGET_TYPES
  },
  get validateWidgetsBusinessRules () {
    return require('../stageConfig/validations/stageConfigSchema')
      .validateWidgetsBusinessRules
  },
  get buildStageFormSnapshot () {
    return require('../services/stageFormSnapshotBuilder').buildStageFormSnapshot
  },

  // ── Display helpers ─────────────────────────────────────────
  get formatTransactionHistoryForDisplay () {
    return require('../taskCamunda/utils/transactionHistoryDisplay')
      .formatTransactionHistoryForDisplay
  },
  get enrichHistoryTemplatesWithDocumentInstances () {
    return require('../taskCamunda/utils/transactionHistoryDisplay')
      .enrichHistoryTemplatesWithDocumentInstances
  },
  get buildHistoryStageEntry () {
    return require('../taskCamunda/utils/transactionHistoryDisplay')
      .buildHistoryStageEntry
  },
  get normalizeProcessPriority () {
    return require('../taskCamunda/utils/employeeTaskFormatters')
      .normalizeProcessPriority
  },
  get formatTransactionDate () {
    return require('../taskCamunda/utils/employeeTaskFormatters')
      .formatTransactionDate
  },
  get calculateProgressPercent () {
    return require('../taskCamunda/utils/employeeTaskStatus')
      .calculateProgressPercent
  },

  // ── Document submit (application services) ──────────────────
  get createDocumentSubmitSigningChallenge () {
    return require('../taskCamunda/services/documentSubmitService')
      .createDocumentSubmitSigningChallenge
  },
  get createDocumentSubmitSigningChallengeByProcess () {
    return require('../taskCamunda/services/documentSubmitService')
      .createDocumentSubmitSigningChallengeByProcess
  },
  get completeDocumentSubmit () {
    return require('../taskCamunda/services/documentSubmitService')
      .completeDocumentSubmit
  },

  // ── Internal application API (replaces workflowClient in-process) ─
  get getProcessById () {
    const processRepository =
      require('../processDefinition/repositories/processRepository')

    return async function getProcessById (processId) {
      const id = Number.parseInt(processId, 10)

      if (!Number.isInteger(id) || id < 1) {
        return null
      }

      return processRepository.findById(id)
    }
  }
}
