'use strict'

function normalizeTypeDocId (raw) {
  if (raw == null || raw === '') {
    return null
  }

  const parsed = Number(raw)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function pickTypeDocIdFromObject (obj = {}) {
  return normalizeTypeDocId(
    obj.type_doc_id ?? obj.typeDoc_id ?? obj.type_Doc_id ?? obj.TypeDoc_id
  )
}

module.exports = {
  normalizeTypeDocId,
  pickTypeDocIdFromObject
}
