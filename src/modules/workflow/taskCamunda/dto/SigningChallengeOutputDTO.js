'use strict'

class SigningChallengeOutputDTO {
  constructor ({
    challenge,
    task,
    transaction,
    stage,
    userKey,
    payloadHash,
    expiresInSeconds
  }) {
    this.signing_id = challenge.id
    this.task_id = task.id
    this.transaction_id = transaction.id
    this.stage_code = stage.code
    this.key_fingerprint = userKey.key_fingerprint
    this.message = challenge.message
    this.payload_hash = payloadHash
    this.expires_at = challenge.expires_at
    this.expires_in_seconds = expiresInSeconds
  }
}

module.exports = {
  SigningChallengeOutputDTO
}
