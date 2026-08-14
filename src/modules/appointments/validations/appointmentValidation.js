'use strict'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
const NATIONAL_ID_RE = /^\d{1,11}$/
const PHONE_RE = /^09\d{8}$/
const {
  CITIZEN_BOOKING_STATUSES
} = require('../constants/bookingStatus')

function todayDateOnly () {
  return new Date().toISOString().slice(0, 10)
}

function normalizeTime (value) {
  const raw = String(value || '').trim()
  if (!TIME_RE.test(raw)) return null
  return raw.length === 5 ? `${raw}:00` : raw
}

function compareTime (a, b) {
  return String(a).localeCompare(String(b))
}

function validateCreateSlotInput (body) {
  const appointment_date = String(body.appointment_date || '').trim()
  const start_time = normalizeTime(body.start_time)
  const end_time = normalizeTime(body.end_time)
  const capacity = Number(body.capacity)

  if (!DATE_RE.test(appointment_date)) {
    return { error: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD' }
  }

  if (!start_time || !end_time) {
    return { error: 'وقت البداية والنهاية يجب أن يكونا بصيغة HH:MM أو HH:MM:SS' }
  }

  if (compareTime(end_time, start_time) <= 0) {
    return { error: 'وقت النهاية يجب أن يكون بعد وقت البداية' }
  }

  if (!Number.isInteger(capacity) || capacity < 1) {
    return { error: 'عدد الطلبات المتاحة يجب أن يكون عدداً صحيحاً أكبر من صفر' }
  }

  return {
    value: {
      appointment_date,
      start_time,
      end_time,
      capacity
    }
  }
}

function validateUpdateSlotInput (body) {
  const result = validateCreateSlotInput({
    appointment_date: body.appointment_date,
    start_time: body.start_time,
    end_time: body.end_time,
    capacity: body.capacity
  })

  if (result.error) return result

  const payload = { ...result.value }

  if (body.is_active !== undefined) {
    payload.is_active = Boolean(body.is_active)
  }

  return { value: payload }
}

function validateBookInput (body) {
  const appointment_id = Number(body.appointment_id)
  const first_name = String(body.first_name || '').trim()
  const last_name = String(body.last_name || '').trim()
  const father_name = String(body.father_name || '').trim()
  const mother_name = String(body.mother_name || '').trim()
  const national_id = String(body.national_id || '').trim()
  const phone_number = String(body.phone_number || '').trim()
  const reason = String(body.reason || '').trim()

  if (!Number.isInteger(appointment_id) || appointment_id < 1) {
    return { error: 'موعد_id غير صالح' }
  }

  if (!first_name || !last_name || !father_name || !mother_name) {
    return { error: 'الأسماء الأربعة مطلوبة' }
  }

  if (!NATIONAL_ID_RE.test(national_id)) {
    return { error: 'الرقم الوطني يجب أن يكون أرقاماً فقط وبحد أقصى 11 رقماً' }
  }

  if (!PHONE_RE.test(phone_number)) {
    return { error: 'رقم الهاتف يجب أن يبدأ بـ 09 ويتكون من 10 أرقام' }
  }

  if (!reason) {
    return { error: 'سبب الموعد مطلوب' }
  }

  return {
    value: {
      appointment_id,
      first_name,
      last_name,
      father_name,
      mother_name,
      national_id,
      phone_number,
      reason
    }
  }
}

function validateDecisionInput (body) {
  const decision = String(body.decision || body.status || '').trim().toLowerCase()
  const note = String(body.note || body.decision_note || '').trim()

  if (!['approved', 'rejected'].includes(decision)) {
    return { error: 'decision يجب أن تكون approved أو rejected' }
  }

  if (!note) {
    return { error: 'ملاحظة القرار (note) مطلوبة في الموافقة والرفض' }
  }

  return { value: { decision, note } }
}

function validateAttendanceInput (body) {
  if (body.attended === undefined || body.attended === null) {
    return { error: 'attended مطلوب (true/false)' }
  }

  const raw = body.attended
  const attended =
    raw === true ||
    raw === 'true' ||
    raw === 1 ||
    raw === '1'

  const clearlyFalse =
    raw === false ||
    raw === 'false' ||
    raw === 0 ||
    raw === '0'

  if (!attended && !clearlyFalse) {
    return { error: 'attended يجب أن يكون true أو false' }
  }

  return { value: { attended: Boolean(attended) } }
}

function validateManageFilter (filter) {
  const value = String(filter || '').trim().toLowerCase()
  if (!['approved', 'pending', 'past'].includes(value)) {
    return { error: 'filter يجب أن يكون approved أو pending أو past' }
  }
  return { value }
}

function validateCitizenBookingStatus (status) {
  if (status == null || String(status).trim() === '') {
    return { value: null }
  }

  const value = String(status).trim().toLowerCase()
  if (!CITIZEN_BOOKING_STATUSES.includes(value)) {
    return {
      error: 'status يجب أن يكون pending أو approved أو rejected أو postponed'
    }
  }

  return { value }
}

module.exports = {
  todayDateOnly,
  normalizeTime,
  validateCreateSlotInput,
  validateUpdateSlotInput,
  validateBookInput,
  validateDecisionInput,
  validateAttendanceInput,
  validateManageFilter,
  validateCitizenBookingStatus
}
