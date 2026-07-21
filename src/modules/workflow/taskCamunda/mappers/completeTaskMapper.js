'use strict'

const { CompleteTaskOutputDTO } = require('../dto/CompleteTaskOutputDTO')

function toCompleteTaskResponse ({
  stage,
  stageSnapshot,
  variables = null,
  signatureRequest = null,
  idempotencyKey = null,
  idempotentReplay = false,
  workflowStatus = 'running',
  templates = []
}) {
  return new CompleteTaskOutputDTO({
    stage,
    stageSnapshot,
    variables,
    signatureRequest,
    idempotencyKey,
    idempotentReplay,
    workflowStatus,
    templates
  })
}

function toPublicSignatureRecord (record) {
  if (!record) {
    return null
  }

  const {
    challenge,
    digitalSignature,
    userKey,
    signed_message: signedMessage,
    ...publicRecord
  } = record

  return publicRecord
}

module.exports = {
  toCompleteTaskResponse,
  toPublicSignatureRecord
}
