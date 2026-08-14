'use strict'

const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')

const {
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
} = require('../services/appointmentService')

const createSlot = asyncHandler(async (req, res) => {
  try {
    const result = await createAppointmentSlotService(req.body, req.user?.id)
    return ApiResponder.createdResponse(res, result, 'تم إضافة الموعد بنجاح')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const listAvailable = asyncHandler(async (req, res) => {
  try {
    const result = await listAvailableSlotsService()
    return ApiResponder.okResponse(res, result, 'تم جلب المواعيد المتاحة')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const book = asyncHandler(async (req, res) => {
  try {
    const result = await bookAppointmentService({
      body: req.body,
      file: req.file,
      userId: req.user.id
    })
    return ApiResponder.createdResponse(res, result, 'تم إرسال طلب الحجز بنجاح')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const listManaged = asyncHandler(async (req, res) => {
  try {
    const result = await listManagedAppointmentsService(req.query.filter)
    return ApiResponder.okResponse(res, result, 'تم جلب مواعيد الإدارة')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const deleteSlot = asyncHandler(async (req, res) => {
  try {
    const result = await deleteAppointmentSlotService(req.params.id, req.user?.id)
    return ApiResponder.okResponse(res, result, 'تم حذف الموعد وإشعار المحجوزين الموافق عليهم')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const updateSlot = asyncHandler(async (req, res) => {
  try {
    const result = await updateAppointmentSlotService(
      req.params.id,
      req.body,
      req.user?.id
    )
    return ApiResponder.okResponse(res, result, 'تم تعديل الموعد')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const decideBooking = asyncHandler(async (req, res) => {
  try {
    const result = await decideBookingService(
      req.params.bookingId,
      req.body,
      req.user?.id
    )
    return ApiResponder.okResponse(res, result, 'تم اتخاذ قرار الحجز')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const updateAttendance = asyncHandler(async (req, res) => {
  try {
    const result = await updateAttendanceService(req.params.bookingId, req.body)
    return ApiResponder.okResponse(res, result, 'تم تحديث حالة الحضور')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const listMyBookings = asyncHandler(async (req, res) => {
  try {
    const result = await listMyBookingsService(req.user.id, req.query.status)
    return ApiResponder.okResponse(res, result, 'تم جلب حجوزاتك')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

const deletePastBooking = asyncHandler(async (req, res) => {
  try {
    const result = await deletePastBookingService(req.params.bookingId)
    return ApiResponder.okResponse(res, result, 'تم حذف الحجز السابق بدون إشعار')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

module.exports = {
  createSlot,
  listAvailable,
  book,
  listManaged,
  deleteSlot,
  updateSlot,
  decideBooking,
  updateAttendance,
  listMyBookings,
  deletePastBooking
}
