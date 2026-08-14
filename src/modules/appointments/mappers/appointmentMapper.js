'use strict'

const { STATUS_LABELS } = require('../constants/bookingStatus')

function formatTime (value) {
  if (!value) return null
  return String(value).slice(0, 8)
}

function toPublicUploadUrl (storedPath) {
  if (!storedPath) return null
  return String(storedPath).startsWith('/') ? storedPath : `/${storedPath}`
}

function mapBooking (booking) {
  const plain = booking?.toJSON ? booking.toJSON() : booking
  const status = plain.status || null

  return {
    id: plain.id,
    appointment_id: plain.appointment_id,
    user_id: plain.user_id,
    first_name: plain.first_name,
    last_name: plain.last_name,
    father_name: plain.father_name,
    mother_name: plain.mother_name,
    national_id: plain.national_id,
    phone_number: plain.phone_number,
    identity_image_path: toPublicUploadUrl(plain.identity_image_path),
    reason: plain.reason,
    status,
    status_label: STATUS_LABELS[status] || status,
    queue_order: plain.queue_order,
    attended: plain.attended,
    decision_note: plain.decision_note,
    decided_by: plain.decided_by,
    decided_at: plain.decided_at,
    created_at: plain.created_at,
    updated_at: plain.updated_at
  }
}

function mapSlot (slot, extras = {}) {
  const plain = slot?.toJSON ? slot.toJSON() : slot
  const approvedTaken = extras.approved_taken ?? extras.taken_count ?? 0
  const remaining = Math.max(0, Number(plain.capacity) - Number(approvedTaken))

  return {
    id: plain.id,
    appointment_date: plain.appointment_date,
    start_time: formatTime(plain.start_time),
    end_time: formatTime(plain.end_time),
    capacity: plain.capacity,
    approved_taken: Number(approvedTaken),
    remaining_seats: remaining,
    is_active: plain.is_active,
    created_by: plain.created_by,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    bookings: Array.isArray(extras.bookings)
      ? extras.bookings.map(mapBooking)
      : undefined
  }
}

module.exports = {
  mapSlot,
  mapBooking,
  formatTime
}
