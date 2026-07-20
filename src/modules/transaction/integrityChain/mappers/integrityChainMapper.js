'use strict'

const { IntegrityLinkOutputDTO } = require('../dto/IntegrityLinkOutputDTO')
const {
  IntegrityChainVerifyOutputDTO
} = require('../dto/IntegrityChainVerifyOutputDTO')
const { IntegrityChainOutputDTO } = require('../dto/IntegrityChainOutputDTO')
const {
  DocumentQrVerifyOutputDTO
} = require('../dto/DocumentQrVerifyOutputDTO')
const {
  PublicDocumentVerifyOutputDTO
} = require('../dto/PublicDocumentVerifyOutputDTO')
const { IdentityPersonOutputDTO } = require('../dto/IdentityPersonOutputDTO')
const { SignerOutputDTO } = require('../dto/SignerOutputDTO')
const {
  FinalDocumentPublicOutputDTO
} = require('../dto/FinalDocumentPublicOutputDTO')
const {
  DocumentQrScanBundleOutputDTO
} = require('../dto/DocumentQrScanBundleOutputDTO')
const { toPublicFileUrl } = require('../../../../core/utils/filePath')

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function toIntegrityLinkDTO (link) {
  const plain = toPlain(link) || {}
  return new IntegrityLinkOutputDTO(plain)
}

function toVerifyResultDTO (payload) {
  return new IntegrityChainVerifyOutputDTO(payload)
}

function toIntegrityChainDTO (payload) {
  return new IntegrityChainOutputDTO({
    ...payload,
    links: (payload.links || []).map(toIntegrityLinkDTO),
    last_verification: payload.last_verification
      ? toVerifyResultDTO(payload.last_verification)
      : null
  })
}

function toDocumentQrVerifyDTO (payload) {
  return new DocumentQrVerifyOutputDTO({
    ...payload,
    chain: payload.chain ? toVerifyResultDTO(payload.chain) : undefined
  })
}

function toIdentityPersonDTO (source) {
  return new IdentityPersonOutputDTO(source)
}

function toPublicDocumentVerifyDTO (payload) {
  return new PublicDocumentVerifyOutputDTO({
    ...payload,
    identity: payload.identity
      ? toIdentityPersonDTO(payload.identity)
      : undefined
  })
}

function toSignerDTO (link) {
  const plain = toPlain(link) || {}
  const user = plain.digital_signature?.user_key?.user || {}

  return new SignerOutputDTO({
    signature_order: plain.signature_order,
    stage_code: plain.stage_code ?? null,
    signed_at: plain.signed_at ?? plain.digital_signature?.signed_at ?? null,
    user_id: plain.digital_signature?.user_key?.user_id ?? user.id ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    father_name: user.father_name ?? null,
    mother_name: user.mother_name ?? null,
    national_id: user.national_id ?? null
  })
}

function toFinalDocumentPublicDTO (row) {
  const plain = toPlain(row)

  if (!plain) {
    return new FinalDocumentPublicOutputDTO({
      available: false,
      message: 'لم يتم توليد الوثيقة النهائية لهذه المعاملة بعد'
    })
  }

  return new FinalDocumentPublicOutputDTO({
    available: true,
    id: plain.id,
    file_path: plain.file_path,
    file_url: toPublicFileUrl(plain.file_path),
    original_name: plain.original_name ?? null,
    mime_type: plain.mime_type ?? null,
    file_size_bytes: plain.file_size_bytes ?? null,
    generated_at: plain.generated_at ?? null
  })
}

function toDocumentQrScanBundleDTO (payload) {
  return new DocumentQrScanBundleOutputDTO(payload)
}

module.exports = {
  toIntegrityLinkDTO,
  toVerifyResultDTO,
  toIntegrityChainDTO,
  toDocumentQrVerifyDTO,
  toIdentityPersonDTO,
  toPublicDocumentVerifyDTO,
  toSignerDTO,
  toFinalDocumentPublicDTO,
  toDocumentQrScanBundleDTO
}
