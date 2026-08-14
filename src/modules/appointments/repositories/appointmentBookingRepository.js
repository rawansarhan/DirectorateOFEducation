'use strict'

const { Op } = require('sequelize')
const { AppointmentBooking, AppointmentSlot } = require('../../../entities')
const {
  BOOKING_STATUS,
  OCCUPIED_STATUSES,
  ACTIVE_BOOKING_STATUSES
} = require('../constants/bookingStatus')

async function createBooking (data, options = {}) {
  return AppointmentBooking.create(data, options)
}
//هذه الدالة للعثور على الحجز بواسطة المعرف الفريد للحجز
async function findBookingById (id, options = {}) {
  const { includeAppointment = true, ...rest } = options

  return AppointmentBooking.findByPk(id, {
    ...(includeAppointment
      ? {
        include: [
          {
            model: AppointmentSlot,
            as: 'appointment'
          }
        ]
      }
      : {}),
    ...rest
  })
}
//هذه االدلة للعثور علة الحجز النشط للمستخدم 
async function findActiveBookingForUserOnSlot (userId, appointmentId, options = {}) {
  return AppointmentBooking.findOne({
    where: {
      user_id: userId,
      appointment_id: appointmentId,
      status: { [Op.in]: ACTIVE_BOOKING_STATUSES }
    },
    ...options
  })
}
//هذه الدالة للعثور على الحجز المشغل للموعد المحدد
async function findOccupiedByAppointmentId (appointmentId, options = {}) {
  return AppointmentBooking.findAll({
    where: {
      appointment_id: appointmentId,
      status: { [Op.in]: OCCUPIED_STATUSES }
    },
    order: [['queue_order', 'ASC'], ['id', 'ASC']],
    ...options
  })
}
//
async function countOccupiedByAppointmentId (appointmentId, options = {}) {
  return AppointmentBooking.count({
    where: {
      appointment_id: appointmentId,
      status: { [Op.in]: OCCUPIED_STATUSES }
    },
    ...options
  })
}
//هذه الدالة للعثور على الحجز الاعلى بالمكان 
async function findMaxQueueOrder (appointmentId, options = {}) {
  const max = await AppointmentBooking.max('queue_order', {
    where: {
      appointment_id: appointmentId,
      status: { [Op.in]: OCCUPIED_STATUSES }
    },
    ...options
  })

  return Number(max || 0)
}
//هذه الدالة لتحويل الحجز الموافق عليه لمؤجل 
async function markApprovedAsPostponed (appointmentId, options = {}) {
  return AppointmentBooking.update(
    { status: BOOKING_STATUS.POSTPONED },
    {
      where: {
        appointment_id: appointmentId,
        status: BOOKING_STATUS.APPROVED
      },
      ...options
    }
  )
}
//هذه الدالة للعثور على الحجز الخاص بالمستخدم
async function findMyBookings (userId, { fromDate = null, status = null } = {}) {
  const includeWhere = {}

  if (fromDate) {
    includeWhere.appointment_date = { [Op.gte]: fromDate }
  }

  const where = { user_id: userId }

  if (status) {
    where.status = status
  }

  return AppointmentBooking.findAll({
    where,
    include: [
      {
        model: AppointmentSlot,
        as: 'appointment',
        required: true,
        where: includeWhere
      }
    ],
    order: [
      [{ model: AppointmentSlot, as: 'appointment' }, 'appointment_date', 'ASC'],
      ['id', 'DESC']
    ]
  })
}

async function updateBooking (booking, data, options = {}) {
  return booking.update(data, options)
}

async function deleteBooking (booking, options = {}) {
  return booking.destroy(options)
}

module.exports = {
  createBooking,
  findBookingById,
  findActiveBookingForUserOnSlot,
  findOccupiedByAppointmentId,
  countOccupiedByAppointmentId,
  findMaxQueueOrder,
  markApprovedAsPostponed,
  findMyBookings,
  updateBooking,
  deleteBooking
}
