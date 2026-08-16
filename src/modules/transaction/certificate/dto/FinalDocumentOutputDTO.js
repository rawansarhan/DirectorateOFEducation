'use strict'

class FinalDocumentOutputDTO {
  constructor (row = {}, { includeQrSnapshot = true } = {}) {
    if (!row || row.available === false) {
      this.available = false
      this.message = row?.message || 'لم يتم توليد نسخة pdf من هذا الطلب'
      return
    }

    this.id = row.id
    this.transaction_id = row.transaction_id ?? null
    this.file_path = row.file_path
    this.file_url = row.file_url ?? row.file_path
    this.original_name = row.original_name
    this.mime_type = row.mime_type
    this.file_size_bytes = row.file_size_bytes
    this.generated_at = row.generated_at

    if (row.content_hash !== undefined) {
      this.content_hash = row.content_hash
    }

    if (row.source_seal_hashes !== undefined) {
      this.source_seal_hashes = row.source_seal_hashes
    }

    if (includeQrSnapshot && row.qr_payload_snapshot !== undefined) {
      this.qr_payload_snapshot = row.qr_payload_snapshot ?? null
    }
  }
}

module.exports = {
  FinalDocumentOutputDTO
}
