'use strict'

const { SigningChallengeOutputDTO } = require('../dto/SigningChallengeOutputDTO')

function toSigningChallenge ({
  challenge,
  task,
  transaction,
  stage,
  userKey,
  payloadHash,
  expiresInSeconds
}) {
  return new SigningChallengeOutputDTO({
    challenge,
    task,
    transaction,
    stage,
    userKey,
    payloadHash,
    expiresInSeconds
  })
}

module.exports = {
  toSigningChallenge
}
