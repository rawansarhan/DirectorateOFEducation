'use strict'

const { FinalDocumentOutputDTO } = require('../dto/FinalDocumentOutputDTO')
const { CertificateBundleOutputDTO } = require('../dto/CertificateBundleOutputDTO')
const { SaveFinalDocumentInputDTO } = require('../dto/SaveFinalDocumentInputDTO')
const {
  FinalDocumentGenerateOutputDTO
} = require('../dto/FinalDocumentGenerateOutputDTO')
const {
  FinalDocumentReadinessOutputDTO
} = require('../dto/FinalDocumentReadinessOutputDTO')

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function toFinalDocumentDTO (row, options = {}) {
  const plain = toPlain(row)

  if (!plain) {
    return new FinalDocumentOutputDTO({
      available: false,
      message: options.missingMessage || 'لم يتم توليد نسخة pdf من هذا الطلب'
    }, { includeQrSnapshot: false })
  }

  return new FinalDocumentOutputDTO({
    id: plain.id,
    file_path: plain.file_path,
    file_url: plain.file_url ?? plain.file_path,
    original_name: plain.original_name,
    mime_type: plain.mime_type,
    file_size_bytes: plain.file_size_bytes,
    generated_at: plain.generated_at,
    content_hash: plain.content_hash,
    qr_payload_snapshot: plain.qr_payload_snapshot
  }, options)
}

function toCertificateBundleDTO (payload) {
  const finalDocument = payload.final_document
    ? toFinalDocumentDTO(payload.final_document, { includeQrSnapshot: false })
    : toFinalDocumentDTO(null)

  return new CertificateBundleOutputDTO({
    ...payload,
    final_document: finalDocument
  })
}

function toSaveFinalDocumentInput (data) {
  return new SaveFinalDocumentInputDTO(data)
}

function toGenerateResultDTO (payload) {
  return new FinalDocumentGenerateOutputDTO(payload)
}

function toReadinessDTO (payload) {
  return new FinalDocumentReadinessOutputDTO(payload)
}

function parseQrPayloadFromBody (body = {}) {
  if (!body?.qr_payload) {
    return null
  }

  if (typeof body.qr_payload === 'object') {
    return body.qr_payload
  }

  try {
    return JSON.parse(body.qr_payload)
  } catch {
    return null
  }
}

module.exports = {
  toFinalDocumentDTO,
  toCertificateBundleDTO,
  toSaveFinalDocumentInput,
  toGenerateResultDTO,
  toReadinessDTO,
  parseQrPayloadFromBody
}
