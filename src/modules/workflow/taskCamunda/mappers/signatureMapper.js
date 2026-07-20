'use strict'

function toDigitalSignatureRecord ({
  document,
  digitalSignature,
  challenge,
  stage,
  userKey
}) {
  return {
    document_id: document.id,
    digital_signature_id: digitalSignature.id,
    signed_hash: digitalSignature.signed_hash,
    previous_signature_hash: digitalSignature.previous_signature_hash,
    signature_order: digitalSignature.signature_order,
    signed_at: digitalSignature.signed_at,
    stage_id: challenge.stage_id,
    stage_code: stage?.code || null,
    task_id: challenge.task_id,
    user_id: challenge.user_id,
    key_fingerprint: userKey.key_fingerprint,
    payload_hash: challenge.payload_hash
  }
}

function toSignatureLedgerEntry ({
  order,
  signature,
  document,
  stageId,
  stageCode
}) {
  return {
    order,
    digital_signature_id: signature.id,
    document_id: document.id,
    stage_id: stageId,
    stage_code: stageCode,
    user_key_id: signature.user_key_id,
    key_fingerprint: signature.user_key?.key_fingerprint || null,
    signed_hash: signature.signed_hash,
    previous_signature_hash: signature.previous_signature_hash,
    payload_hash: signature.signed_hash,
    signed_at: signature.signed_at
  }
}

function toSignatureLedger (transactionId, signatures) {
  return {
    transaction_id: transactionId,
    total_signatures: signatures.length,
    signatures,
    finalized_at: new Date()
  }
}

module.exports = {
  toDigitalSignatureRecord,
  toSignatureLedgerEntry,
  toSignatureLedger
}
