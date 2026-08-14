'use strict'

const { sequelize } = require('../../../entities')
const {
  createHttpError,
  HTTP_STATUS
} = require('../../../core/middleware/httpStatusCodes')
const { normalizeStoredFilePath } = require('../../../core/utils/filePath')

const slotRepo = require('../repositories/appointmentSlotRepository')
const bookingRepo = require('../repositories/appointmentBookingRepository')
const { mapSlot, mapBooking, formatTime } = require('../mappers/appointmentMapper')
const {
  BOOKING_STATUS,
  OCCUPIED_STATUSES
} = require('../constants/bookingStatus')
const {
  todayDateOnly,
  validateCreateSlotInput,
  validateUpdateSlotInput,
  validateBookInput,
  validateDecisionInput,
  validateAttendanceInput,
  validateManageFilter,
  validateCitizenBookingStatus
} = require('../validations/appointmentValidation')
const {
  notifySlotCancelled,
  notifySlotUpdated,
  notifyBookingDecision
} = require('./appointmentNotificationService')

function slotScheduleChanged (previous, next) {
  return (
    String(previous.appointment_date) !== String(next.appointment_date) ||
    formatTime(previous.start_time) !== formatTime(next.start_time) ||
    formatTime(previous.end_time) !== formatTime(next.end_time)
  )
}

function mapBookingWithAppointment (row) {
  const booking = mapBooking(row)
  const slot = row.appointment ? mapSlot(row.appointment) : null

  return {
    ...booking,
    appointment: slot
      ? {
        id: slot.id,
        appointment_date: slot.appointment_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        capacity: slot.capacity
      }
      : null
  }
}

async function createAppointmentSlotService (body, actorUserId) {
  const validated = validateCreateSlotInput(body)
  if (validated.error) {
    throw createHttpError(validated.error, HTTP_STATUS.BAD_REQUEST)
  }

  const slot = await slotRepo.createSlot({
    ...validated.value,
    is_active: true,
    created_by: actorUserId || null
  })

  return mapSlot(slot, { approved_taken: 0 })
}

async function listAvailableSlotsService () {
  const today = todayDateOnly()
  const slots = await slotRepo.findActiveSlotsFromDate(today)
  const counts = await slotRepo.countApprovedByAppointmentIds(slots.map(s => s.id))

  return slots
    .map(slot => {
      const taken = counts[slot.id] || 0
      return mapSlot(slot, { approved_taken: taken })
    })
    .filter(item => item.remaining_seats > 0)
}

async function bookAppointmentService ({ body, file, userId }) {
  const validated = validateBookInput(body)
  if (validated.error) {
    throw createHttpError(validated.error, HTTP_STATUS.BAD_REQUEST)
  }

  if (!file?.filename) {
    throw createHttpError('صورة الهوية مطلوبة', HTTP_STATUS.BAD_REQUEST)
  }

  const identityPath = normalizeStoredFilePath(`/uploads/${file.filename}`)
  const today = todayDateOnly()

  return sequelize.transaction(async (transaction) => {
    const slot = await slotRepo.findSlotById(validated.value.appointment_id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!slot || !slot.is_active) {
      throw createHttpError('الموعد غير موجود أو غير مفعّل', HTTP_STATUS.NOT_FOUND)
    }

    if (String(slot.appointment_date) < today) {
      throw createHttpError('لا يمكن الحجز على موعد انتهى تاريخه', HTTP_STATUS.BAD_REQUEST)
    }

    const existing = await bookingRepo.findActiveBookingForUserOnSlot(
      userId,
      slot.id,
      { transaction }
    )

    if (existing) {
      throw createHttpError(
        'لديك بالفعل طلب حجز قيد الانتظار أو موافق عليه لهذا الموعد',
        HTTP_STATUS.CONFLICT
      )
    }

    const occupied = await bookingRepo.countOccupiedByAppointmentId(slot.id, {
      transaction
    })

    if (occupied >= slot.capacity) {
      throw createHttpError(
        'عذراً لقد تم حجز كل الأوقات خلال هذه الفترة',
        HTTP_STATUS.CONFLICT
      )
    }

    const booking = await bookingRepo.createBooking(
      {
        ...validated.value,
        user_id: userId,
        identity_image_path: identityPath,
        status: BOOKING_STATUS.PENDING,
        queue_order: null,
        attended: null
      },
      { transaction }
    )

    return mapBooking(booking)
  })
}

async function listManagedAppointmentsService (filterRaw) {
  const validated = validateManageFilter(filterRaw)
  if (validated.error) {
    throw createHttpError(validated.error, HTTP_STATUS.BAD_REQUEST)
  }

  const today = todayDateOnly()
  const filter = validated.value
  const slots = await slotRepo.findSlotsByFilter(filter, today)
  const counts = await slotRepo.countApprovedByAppointmentIds(slots.map(s => s.id))

  return slots.map(slot => {
    const plain = slot.toJSON ? slot.toJSON() : slot
    const bookings = (plain.bookings || []).map(mapBooking)
    return mapSlot(slot, {
      approved_taken: counts[slot.id] || 0,
      bookings
    })
  })
}

async function deleteAppointmentSlotService (slotId, actorUserId) {
  const slot = await slotRepo.findSlotById(slotId)
  if (!slot) {
    throw createHttpError('الموعد غير موجود', HTTP_STATUS.NOT_FOUND)
  }

  const occupied = await bookingRepo.findOccupiedByAppointmentId(slot.id)
  await notifySlotCancelled({
    slot,
    bookings: occupied,
    sentByUserId: actorUserId
  })

  await slotRepo.deleteSlot(slot)
  return { id: Number(slotId), deleted: true, notified: occupied.length }
}

async function updateAppointmentSlotService (slotId, body, actorUserId) {
  const validated = validateUpdateSlotInput(body)
  if (validated.error) {
    throw createHttpError(validated.error, HTTP_STATUS.BAD_REQUEST)
  }

  const slot = await slotRepo.findSlotById(slotId)
  if (!slot) {
    throw createHttpError('الموعد غير موجود', HTTP_STATUS.NOT_FOUND)
  }

  const occupiedCount = await bookingRepo.countOccupiedByAppointmentId(slot.id)
  if (validated.value.capacity < occupiedCount) {
    throw createHttpError(
      `لا يمكن تقليل السعة إلى أقل من الحجوزات الموافق عليها حالياً (${occupiedCount})`,
      HTTP_STATUS.BAD_REQUEST
    )
  }

  const previous = {
    appointment_date: slot.appointment_date,
    start_time: slot.start_time,
    end_time: slot.end_time,
    capacity: slot.capacity
  }

  const updated = await slotRepo.updateSlot(slot, validated.value)
  const scheduleChanged = slotScheduleChanged(previous, updated)

  if (scheduleChanged) {
    await bookingRepo.markApprovedAsPostponed(slot.id)
  }

  const occupied = await bookingRepo.findOccupiedByAppointmentId(slot.id)

  if (occupied.length && scheduleChanged) {
    await notifySlotUpdated({
      previousSlot: previous,
      nextSlot: updated,
      bookings: occupied,
      sentByUserId: actorUserId
    })
  }

  return mapSlot(updated, { approved_taken: occupiedCount })
}

async function decideBookingService (bookingId, body, actorUserId) {
  const validated = validateDecisionInput(body)
  if (validated.error) {
    throw createHttpError(validated.error, HTTP_STATUS.BAD_REQUEST)
  }

  const { decision, note } = validated.value

  const result = await sequelize.transaction(async (transaction) => {
    const booking = await bookingRepo.findBookingById(bookingId, {
      includeAppointment: false,
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!booking) {
      throw createHttpError('الحجز غير موجود', HTTP_STATUS.NOT_FOUND)
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      throw createHttpError('يمكن اتخاذ القرار فقط على الحجوزات قيد الانتظار', HTTP_STATUS.BAD_REQUEST)
    }

    const slot = await slotRepo.findSlotById(booking.appointment_id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!slot) {
      throw createHttpError('الموعد المرتبط بالحجز غير موجود', HTTP_STATUS.NOT_FOUND)
    }

    let queueOrder = null

    if (decision === BOOKING_STATUS.APPROVED) {
      const occupied = await bookingRepo.countOccupiedByAppointmentId(slot.id, {
        transaction
      })

      if (occupied >= slot.capacity) {
        throw createHttpError(
          'عذراً لقد تم حجز كل الأوقات خلال هذه الفترة',
          HTTP_STATUS.CONFLICT
        )
      }

      const maxOrder = await bookingRepo.findMaxQueueOrder(slot.id, { transaction })
      queueOrder = maxOrder + 1

      if (queueOrder > slot.capacity) {
        throw createHttpError(
          'عذراً لقد تم حجز كل الأوقات خلال هذه الفترة',
          HTTP_STATUS.CONFLICT
        )
      }
    }

    const updated = await bookingRepo.updateBooking(
      booking,
      {
        status: decision,
        queue_order: decision === BOOKING_STATUS.APPROVED ? queueOrder : null,
        decision_note: note,
        decided_by: actorUserId || null,
        decided_at: new Date()
      },
      { transaction }
    )

    return { booking: updated, slot }
  })

  await notifyBookingDecision({
    booking: result.booking,
    decision,
    note,
    sentByUserId: actorUserId,
    slot: result.slot
  })

  return mapBooking(result.booking)
}

async function updateAttendanceService (bookingId, body) {
  const validated = validateAttendanceInput(body)
  if (validated.error) {
    throw createHttpError(validated.error, HTTP_STATUS.BAD_REQUEST)
  }

  const booking = await bookingRepo.findBookingById(bookingId)
  if (!booking) {
    throw createHttpError('الحجز غير موجود', HTTP_STATUS.NOT_FOUND)
  }

  if (!OCCUPIED_STATUSES.includes(booking.status)) {
    throw createHttpError(
      'يمكن تحديث الحضور فقط للحجوزات الموافق عليها أو المؤجلة',
      HTTP_STATUS.BAD_REQUEST
    )
  }

  const today = todayDateOnly()
  const appointmentDate = String(booking.appointment?.appointment_date || '')

  if (!appointmentDate || appointmentDate > today) {
    throw createHttpError(
      'لا يمكن تعديل حالة الحضور إلا في يوم الموعد أو بعده',
      HTTP_STATUS.BAD_REQUEST
    )
  }

  const updated = await bookingRepo.updateBooking(booking, {
    attended: validated.value.attended
  })

  return mapBooking(updated)
}

async function listMyBookingsService (userId, statusRaw) {
  const validated = validateCitizenBookingStatus(statusRaw)
  if (validated.error) {
    throw createHttpError(validated.error, HTTP_STATUS.BAD_REQUEST)
  }

  const rows = await bookingRepo.findMyBookings(userId, {
    fromDate: todayDateOnly(),
    status: validated.value
  })

  return rows.map(mapBookingWithAppointment)
}

async function deletePastBookingService (bookingId) {
  const booking = await bookingRepo.findBookingById(bookingId)
  if (!booking) {
    throw createHttpError('الحجز غير موجود', HTTP_STATUS.NOT_FOUND)
  }

  const today = todayDateOnly()
  const appointmentDate = String(booking.appointment?.appointment_date || '')

  if (!appointmentDate || appointmentDate >= today) {
    throw createHttpError(
      'يُسمح بحذف الحجوزات المنتهية فقط (تاريخ الموعد قبل اليوم) وبدون إشعار',
      HTTP_STATUS.BAD_REQUEST
    )
  }

  await bookingRepo.deleteBooking(booking)
  return { id: Number(bookingId), deleted: true, notified: false }
}

module.exports = {
  createAppointmentSlotService,
  listAvailableSlotsService,
  bookAppointmentService,
  listManagedAppointmentsService,
  deleteAppointmentSlotService,
  updateAppointmentSlotService,
  decideBookingService,
  updateAttendanceService,
  listMyBookingsService,
  deletePastBookingService
}
