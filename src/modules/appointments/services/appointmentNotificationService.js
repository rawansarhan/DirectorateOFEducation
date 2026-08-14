'use strict'

const { deliverNotificationToUser } = require('../../notification/services/notificationDeliveryService')

function formatSlotLabel (slot) {
  return `${slot.appointment_date} من ${String(slot.start_time).slice(0, 5)} إلى ${String(slot.end_time).slice(0, 5)}`
}

async function notifyApprovedBookings ({ bookings, title, message, type, sentByUserId, data = {} }) {
  const results = []

  for (const booking of bookings) {
    results.push(
      await deliverNotificationToUser({
        userId: booking.user_id,
        sentByUserId,
        title,
        message,
        type,
        data: {
          type,
          bookingId: String(booking.id),
          appointmentId: String(booking.appointment_id),
          ...data
        }
      })
    )
  }

  return results
}

async function notifySlotCancelled ({ slot, bookings, sentByUserId }) {
  const label = formatSlotLabel(slot)
  return notifyApprovedBookings({
    bookings,
    sentByUserId,
    title: 'تم إلغاء الموعد',
    message: `عذراً لقد تم إلغاء موعدكم في تاريخ ${label}`,
    type: 'appointment_cancelled',
    data: {
      appointmentDate: slot.appointment_date,
      startTime: slot.start_time,
      endTime: slot.end_time
    }
  })
}

async function notifySlotUpdated ({ previousSlot, nextSlot, bookings, sentByUserId }) {
  const previousLabel = formatSlotLabel(previousSlot)
  const nextLabel = formatSlotLabel(nextSlot)

  return notifyApprovedBookings({
    bookings,
    sentByUserId,
    title: 'تم تأجيل الموعد',
    message: `تم تأجيل الموعد من (${previousLabel}) إلى (${nextLabel})`,
    type: 'appointment_postponed',
    data: {
      previous: {
        appointmentDate: previousSlot.appointment_date,
        startTime: previousSlot.start_time,
        endTime: previousSlot.end_time,
        capacity: previousSlot.capacity
      },
      next: {
        appointmentDate: nextSlot.appointment_date,
        startTime: nextSlot.start_time,
        endTime: nextSlot.end_time,
        capacity: nextSlot.capacity
      }
    }
  })
}

async function notifyBookingDecision ({ booking, decision, note, sentByUserId, slot }) {
  const approved = decision === 'approved'
  const title = approved ? 'تمت الموافقة على حجز الموعد' : 'تم رفض حجز الموعد'
  const type = approved ? 'appointment_booking_approved' : 'appointment_booking_rejected'
  const slotLabel = slot ? formatSlotLabel(slot) : ''
  const trimmedNote = String(note || '').trim()

  const message = approved
    ? `${trimmedNote}${slotLabel ? ` — الموعد: ${slotLabel}` : ''}${booking.queue_order ? ` — ترتيبك: ${booking.queue_order}` : ''}`
    : trimmedNote

  return deliverNotificationToUser({
    userId: booking.user_id,
    sentByUserId,
    title,
    message,
    type,
    data: {
      type,
      bookingId: String(booking.id),
      appointmentId: String(booking.appointment_id),
      status: decision,
      note: trimmedNote,
      queueOrder: booking.queue_order,
      appointmentDate: slot?.appointment_date || null
    }
  })
}

module.exports = {
  notifySlotCancelled,
  notifySlotUpdated,
  notifyBookingDecision,
  formatSlotLabel
}
