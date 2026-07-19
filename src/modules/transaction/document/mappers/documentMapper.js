'use strict'

const {
  GeneratedDocumentOutputDTO
} = require('../dto/GeneratedDocumentOutputDTO')
const { UploadedFileOutputDTO } = require('../dto/UploadedFileOutputDTO')
const { FinalQrOutputDTO } = require('../dto/FinalQrOutputDTO')
const {
  TransactionDocumentsOutputDTO
} = require('../dto/TransactionDocumentsOutputDTO')
const { DocumentUploadInputDTO } = require('../dto/DocumentUploadInputDTO')
const { DocumentUploadOutputDTO } = require('../dto/DocumentUploadOutputDTO')
const {
  normalizeStoredFilePath,
  toPublicFileUrl,
  isSyntheticSignatureDocumentPath
} = require('../../../../core/utils/filePath')

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

function toGeneratedDocumentDTO (instance) {
  const plain = toPlain(instance) || {}
  const storedPath = normalizeStoredFilePath(plain.generated_pdf_path)

  return new GeneratedDocumentOutputDTO({
    document_instance_id: plain.id,
    document_template_id: plain.document_template_id,
    file_path: storedPath,
    file_url: toPublicFileUrl(plain.generated_pdf_path),
    content_hash: plain.content_hash ?? null,
    status: plain.status,
    generated_at: plain.updated_at ?? plain.created_at ?? null
  })
}

function toUploadedFileDTO (row) {
  const plain = toPlain(row) || {}

  if (isSyntheticSignatureDocumentPath(plain.file_path)) {
    return null
  }

  const storedPath = normalizeStoredFilePath(plain.file_path)

  if (!storedPath) {
    return null
  }

  return new UploadedFileOutputDTO({
    document_id: plain.id,
    file_path: storedPath,
    file_url: toPublicFileUrl(plain.file_path),
    type_doc_id: plain.type_doc_id ?? null,
    type_doc: plain.type_doc
      ? { id: plain.type_doc.id, name: plain.type_doc.name }
      : null,
    type_doc_name: plain.type_doc?.name ?? null,
    signatures_count: Array.isArray(plain.signatures) ? plain.signatures.length : 0,
    uploaded_at: plain.created_at ?? null
  })
}

function toFinalQrDTO (payload) {
  return new FinalQrOutputDTO(payload)
}

function toTransactionDocumentsDTO ({
  transaction_id,
  status,
  generated_documents = [],
  uploaded_files = [],
  final_qr = null
}) {
  return new TransactionDocumentsOutputDTO({
    transaction_id,
    status,
    generated_documents: generated_documents.map(toGeneratedDocumentDTO),
    uploaded_files: uploaded_files
      .map(toUploadedFileDTO)
      .filter(Boolean),
    final_qr: toFinalQrDTO(final_qr || { available: false })
  })
}

function toUploadInput (data) {
  return new DocumentUploadInputDTO(data)
}

function toUploadOutputDTO (payload) {
  return new DocumentUploadOutputDTO(payload)
}

module.exports = {
  toGeneratedDocumentDTO,
  toUploadedFileDTO,
  toFinalQrDTO,
  toTransactionDocumentsDTO,
  toUploadInput,
  toUploadOutputDTO
}
