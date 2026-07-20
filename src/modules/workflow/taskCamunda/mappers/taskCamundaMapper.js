'use strict'

/**
 * Barrel re-export for taskCamunda mappers.
 * Prefer importing from the focused mapper file when adding new call sites.
 */

const { toEmployeeTaskItem } = require('./employeeTaskMapper')
const { toTaskDetails } = require('./taskDetailsMapper')
const {
  toCompleteTaskResponse,
  toPublicSignatureRecord
} = require('./completeTaskMapper')
const { toSigningChallenge } = require('./signingChallengeMapper')
const { toStartWorkflow } = require('./startWorkflowMapper')
const {
  toDigitalSignatureRecord,
  toSignatureLedgerEntry,
  toSignatureLedger
} = require('./signatureMapper')

module.exports = {
  toEmployeeTaskItem,
  toTaskDetails,
  toCompleteTaskResponse,
  toPublicSignatureRecord,
  toSigningChallenge,
  toStartWorkflow,
  toDigitalSignatureRecord,
  toSignatureLedgerEntry,
  toSignatureLedger
}
