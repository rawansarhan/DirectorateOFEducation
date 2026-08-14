'use strict'

const { Op } = require('sequelize')
const { AppointmentSlot, AppointmentBooking } = require('../../../entities')
const {
  BOOKING_STATUS,
  OCCUPIED_STATUSES
} = require('../constants/bookingStatus')

async function createSlot (data, options = {}) {
  return AppointmentSlot.create(data, options)
}

async function findSlotById (id, options = {}) {
  return AppointmentSlot.findByPk(id, options)
}

async function updateSlot (slot, data, options = {}) {
  return slot.update(data, options)
}

async function deleteSlot (slot, options = {}) {
  return slot.destroy(options)
}
//
async function findActiveSlotsFromDate (fromDate) {
  return AppointmentSlot.findAll({
    where: {
      is_active: true,
      appointment_date: { [Op.gte]: fromDate }
    },
    order: [
      ['appointment_date', 'ASC'],
      ['start_time', 'ASC']
    ]
  })
}

async function findSlotsByFilter (filter, today) {
  if (filter === 'past') {
    return AppointmentSlot.findAll({
      where: {
        appointment_date: { [Op.lt]: today }
      },
      include: [
        {
          model: AppointmentBooking,
          as: 'bookings',
          required: false
        }
      ],
      order: [
        ['appointment_date', 'DESC'],
        ['start_time', 'DESC'],
        [{ model: AppointmentBooking, as: 'bookings' }, 'queue_order', 'ASC'],
        [{ model: AppointmentBooking, as: 'bookings' }, 'id', 'ASC']
      ]
    })
  }

  if (filter === 'approved') {
    return AppointmentSlot.findAll({
      where: {
        appointment_date: { [Op.gte]: today }
      },
      include: [
        {
          model: AppointmentBooking,
          as: 'bookings',
          required: true,
          where: { status: { [Op.in]: OCCUPIED_STATUSES } }
        }
      ],
      order: [
        ['appointment_date', 'ASC'],
        ['start_time', 'ASC'],
        [{ model: AppointmentBooking, as: 'bookings' }, 'queue_order', 'ASC']
      ]
    })
  }

  // pending — مواعيد مستقبلية/حالية مع طلبات لم تُوافق بعد
  return AppointmentSlot.findAll({
    where: {
      appointment_date: { [Op.gte]: today },
      is_active: true
    },
    include: [
      {
        model: AppointmentBooking,
        as: 'bookings',
        required: true,
        where: { status: BOOKING_STATUS.PENDING }
      }
    ],
    order: [
      ['appointment_date', 'ASC'],
      ['start_time', 'ASC'],
      [{ model: AppointmentBooking, as: 'bookings' }, 'id', 'ASC']
    ]
  })
}

async function countApprovedByAppointmentIds (appointmentIds, options = {}) {
  if (!appointmentIds.length) return {}

  const rows = await AppointmentBooking.findAll({
    attributes: [
      'appointment_id',
      [AppointmentBooking.sequelize.fn('COUNT', AppointmentBooking.sequelize.col('id')), 'approved_count']
    ],
    where: {
      appointment_id: { [Op.in]: appointmentIds },
      status: { [Op.in]: OCCUPIED_STATUSES }
    },
    group: ['appointment_id'],
    raw: true,
    ...options
  })

  return rows.reduce((acc, row) => {
    acc[row.appointment_id] = Number(row.approved_count || 0)
    return acc
  }, {})
}

module.exports = {
  createSlot,
  findSlotById,
  updateSlot,
  deleteSlot,
  findActiveSlotsFromDate,
  findSlotsByFilter,
  countApprovedByAppointmentIds
}
