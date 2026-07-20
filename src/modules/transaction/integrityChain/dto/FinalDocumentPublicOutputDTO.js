'use strict'

class FinalDocumentPublicOutputDTO {
  constructor (payload = {}) {
    this.available = Boolean(payload.available)

    if (!this.available) {
      this.message =
        payload.message || 'لم يتم توليد الوثيقة النهائية لهذه المعاملة بعد'
      return
    }

    this.id = payload.id
    this.file_path = payload.file_path
    this.file_url = payload.file_url
    this.original_name = payload.original_name ?? null
    this.mime_type = payload.mime_type ?? null
    this.file_size_bytes = payload.file_size_bytes ?? null
    this.generated_at = payload.generated_at ?? null
  }
}

module.exports = {
  FinalDocumentPublicOutputDTO
}
