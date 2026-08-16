'use strict'

class SigningChallengeOutputDTO {
  constructor ({
    challenge,
    task,
    transaction,
    stage,
    userKey,
    payloadHash,
    stageDataHash = null,
    expiresInSeconds
  }) {
    this.signing_id = challenge.id
    this.challenge_id = challenge.id
    this.task_id = task.id
    this.transaction_id = transaction.id
    this.stage_code = stage.code
    this.key_fingerprint = userKey.key_fingerprint
    this.message = challenge.message
    this.payload_hash = payloadHash
    this.stage_data_hash = stageDataHash || challenge.stage_data_hash || null
    this.expires_at = challenge.expires_at
    this.expires_in_seconds = expiresInSeconds
  }
}

module.exports = {
  SigningChallengeOutputDTO
}
