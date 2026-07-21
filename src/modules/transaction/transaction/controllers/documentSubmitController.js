'use strict'

/**
 * HTTP adapters for document-submit flows mounted under /api/transaction.
 * Calls workflow application services via workflow/public — never workflow controllers.
 */

const {
  createDocumentSubmitSigningChallenge,
  createDocumentSubmitSigningChallengeByProcess,
  completeDocumentSubmit
} = require('../../../workflow/public')
const { getClientMeta } = require('../../../../core/security/securityConfig')
const {
  sendWorkflowSuccess,
  sendWorkflowError
} = require('../../../../core/utils/workflowResponseHelper')

function handleDocumentSubmitError (res, error, defaultStatus = 400) {
  return sendWorkflowError(res, error, defaultStatus)
}

async function createDocumentSubmitSigningChallengeByProcessController (req, res) {
  try {
    const result = await createDocumentSubmitSigningChallengeByProcess({
      processId: req.params.processId,
      userId: req.user.id,
      payload: req.body || {},
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status =
      error.code === 'FORBIDDEN' || error.code === 'UNAUTHORIZED'
        ? 403
        : ['PROCESS_NOT_FOUND', 'TRANSACTION_NOT_FOUND'].includes(error.code)
          ? 404
          : 400

    return handleDocumentSubmitError(res, error, status)
  }
}

async function createDocumentSubmitSigningChallengeByTransactionController (req, res) {
  try {
    const result = await createDocumentSubmitSigningChallenge({
      transactionId: req.params.transactionId,
      userId: req.user.id,
      payload: req.body || {},
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    const status =
      error.code === 'FORBIDDEN' || error.code === 'UNAUTHORIZED'
        ? 403
        : ['TRANSACTION_NOT_FOUND', 'PROCESS_INSTANCE_NOT_FOUND', 'NO_ACTIVE_TASK'].includes(
          error.code
        )
          ? 404
          : 400

    return handleDocumentSubmitError(res, error, status)
  }
}

async function completeDocumentSubmitByTransactionController (req, res) {
  try {
    const result = await completeDocumentSubmit({
      transactionId: req.params.transactionId,
      userId: req.user.id,
      payload: req.body || {},
      clientMeta: getClientMeta(req)
    })

    return sendWorkflowSuccess(res, result.data, result.message)
  } catch (error) {
    if (error.code === 'IDEMPOTENT_REPLAY' && error.result) {
      return sendWorkflowSuccess(
        res,
        error.result.data,
        error.result.message
      )
    }

    const status =
      error.code === 'FORBIDDEN' || error.code === 'UNAUTHORIZED'
        ? 403
        : ['TRANSACTION_NOT_FOUND', 'PROCESS_INSTANCE_NOT_FOUND', 'NO_ACTIVE_TASK'].includes(
          error.code
        )
          ? 404
          : ['VALIDATION_ERROR', 'SIGNATURE_REQUIRED', 'SUBMIT_NOT_DRAFT'].includes(
            error.code
          )
            ? 400
            : error.code === 'WORKFLOW_START_FAILED'
              ? 502
              : 500

    return handleDocumentSubmitError(res, error, status)
  }
}

module.exports = {
  createDocumentSubmitSigningChallengeByProcessController,
  createDocumentSubmitSigningChallengeByTransactionController,
  completeDocumentSubmitByTransactionController
}
