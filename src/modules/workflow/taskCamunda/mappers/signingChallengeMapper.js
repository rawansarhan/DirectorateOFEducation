'use strict'

const { SigningChallengeOutputDTO } = require('../dto/SigningChallengeOutputDTO')

function toSigningChallenge ({
  challenge,
  task,
  transaction,
  stage,
  userKey,
  payloadHash,
  stageDataHash = null,
  expiresInSeconds
}) {
  return new SigningChallengeOutputDTO({
    challenge,
    task,
    transaction,
    stage,
    userKey,
    payloadHash,
    stageDataHash,
    expiresInSeconds
  })
}

module.exports = {
  toSigningChallenge
}
