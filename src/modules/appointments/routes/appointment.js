'use strict'

const express = require('express')
const router = express.Router()

const { authMiddleware, authorize } = require('../../../core/middleware/authMiddleware')
const {
  uploadIdentityImage,
  runMulterUpload
} = require('../../../core/middleware/upload')

const {
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
} = require('../controllers/appointmentController')

/**
 * @swagger
 * /api/appointments/slots:
 *   post:
 *     summary: إضافة موعد متاح للحجز
 *     description: |
 *       صلاحية الموظف `APPOINTMENT_MANAGE`.
 *       التاريخ بصيغة `YYYY-MM-DD` والوقت `HH:MM` أو `HH:MM:SS`.
 *       وقت النهاية يجب أن يكون بعد وقت البداية، و`capacity` ≥ 1.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentSlotCreate'
 *           examples:
 *             morning_window:
 *               summary: فترة صباحية — 5 مقاعد
 *               value:
 *                 appointment_date: "2026-09-01"
 *                 start_time: "09:00"
 *                 end_time: "11:00"
 *                 capacity: 5
 *             afternoon_window:
 *               summary: فترة بعد الظهر
 *               value:
 *                 appointment_date: "2026-09-01"
 *                 start_time: "12:30"
 *                 end_time: "14:00"
 *                 capacity: 3
 *     responses:
 *       201:
 *         description: تم إضافة الموعد بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentSlotCreatedEnvelope'
 *             example:
 *               success: true
 *               status_code: 201
 *               message: تم إضافة الموعد بنجاح
 *               data:
 *                 id: 8
 *                 appointment_date: "2026-09-01"
 *                 start_time: "09:00:00"
 *                 end_time: "11:00:00"
 *                 capacity: 5
 *                 approved_taken: 0
 *                 remaining_seats: 5
 *                 is_active: true
 *                 created_by: 5
 *                 created_at: "2026-08-14T16:00:00.000Z"
 *                 updated_at: "2026-08-14T16:00:00.000Z"
 *       400:
 *         description: بيانات غير صالحة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               bad_date:
 *                 summary: صيغة تاريخ خاطئة
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: صيغة التاريخ يجب أن تكون YYYY-MM-DD
 *                   error: صيغة التاريخ يجب أن تكون YYYY-MM-DD
 *                   data: null
 *               end_before_start:
 *                 summary: وقت النهاية قبل البداية
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: وقت النهاية يجب أن يكون بعد وقت البداية
 *                   error: وقت النهاية يجب أن يكون بعد وقت البداية
 *                   data: null
 *       403:
 *         description: لا توجد صلاحية
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentErrorForbidden'
 */
router.post(
  '/slots',
  authMiddleware,
  authorize('APPOINTMENT_MANAGE'),
  createSlot
)

/**
 * @swagger
 * /api/appointments/slots/available:
 *   get:
 *     summary: عرض المواعيد التي ما زال فيها مقاعد متبقية
 *     description: |
 *       صلاحية `APPOINTMENT_VIEW_AVAILABLE` (موظف ومواطن).
 *
 *       يعيد فقط المواعيد النشطة التي تاريخها **اليوم أو بعده** و`remaining_seats > 0`.
 *       المقاعد المتبقية = `capacity − (approved + postponed)`.
 *
 *       **مثال استدعاء:** `GET /api/appointments/slots/available`
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة المواعيد المتاحة
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 status_code: { type: integer, example: 200 }
 *                 message: { type: string, example: تم جلب المواعيد المتاحة }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AppointmentSlot'
 *             examples:
 *               with_seats:
 *                 summary: مواعيد فيها مقاعد متبقية
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب المواعيد المتاحة
 *                   data:
 *                     - id: 8
 *                       appointment_date: "2026-09-01"
 *                       start_time: "09:00:00"
 *                       end_time: "11:00:00"
 *                       capacity: 5
 *                       approved_taken: 2
 *                       remaining_seats: 3
 *                       is_active: true
 *                       created_by: 5
 *                       created_at: "2026-08-10T08:00:00.000Z"
 *                       updated_at: "2026-08-10T08:00:00.000Z"
 *                     - id: 9
 *                       appointment_date: "2026-09-01"
 *                       start_time: "12:00:00"
 *                       end_time: "14:00:00"
 *                       capacity: 4
 *                       approved_taken: 0
 *                       remaining_seats: 4
 *                       is_active: true
 *                       created_by: 5
 *                       created_at: "2026-08-10T08:05:00.000Z"
 *                       updated_at: "2026-08-10T08:05:00.000Z"
 *               empty:
 *                 summary: لا توجد مواعيد بمقاعد متبقية
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب المواعيد المتاحة
 *                   data: []
 *       401:
 *         description: غير مصادق
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 401
 *               message: No token provided
 *               error: No token provided
 *               data: null
 *       403:
 *         description: لا توجد صلاحية
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentErrorForbidden'
 *             example:
 *               success: false
 *               status_code: 403
 *               message: Forbidden - missing permission
 *               error: Forbidden - missing permission
 *               data: null
 */
router.get(
  '/slots/available',
  authMiddleware,
  authorize('APPOINTMENT_VIEW_AVAILABLE'),
  listAvailable
)

/**
 * @swagger
 * /api/appointments/manage:
 *   get:
 *     summary: إدارة المواعيد مع فلترة
 *     description: |
 *       صلاحية الموظف `APPOINTMENT_MANAGE`.
 *       `filter` إلزامي:
 *       - `approved`: مواعيد اليوم/المستقبل + الحجوزات الموافق عليها أو المؤجلة
 *       - `pending`: مواعيد اليوم/المستقبل + طلبات بانتظار الموافقة + المقاعد المتبقية
 *       - `past`: المواعيد التي تاريخها قبل اليوم + كل حجوزاتها وحالة الحضور
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         required: true
 *         schema:
 *           type: string
 *           enum: [approved, pending, past]
 *         examples:
 *           approved:
 *             value: approved
 *             summary: الموافق عليها / المؤجلة
 *           pending:
 *             value: pending
 *             summary: بانتظار الموافقة
 *           past:
 *             value: past
 *             summary: المواعيد المنتهية
 *     responses:
 *       200:
 *         description: قائمة الإدارة حسب الفلتر
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 status_code: { type: integer, example: 200 }
 *                 message: { type: string, example: تم جلب مواعيد الإدارة }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AppointmentSlot'
 *             examples:
 *               approved:
 *                 summary: filter=approved
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب مواعيد الإدارة
 *                   data:
 *                     - id: 8
 *                       appointment_date: "2026-09-01"
 *                       start_time: "09:00:00"
 *                       end_time: "11:00:00"
 *                       capacity: 5
 *                       approved_taken: 2
 *                       remaining_seats: 3
 *                       is_active: true
 *                       created_by: 5
 *                       created_at: "2026-08-10T08:00:00.000Z"
 *                       updated_at: "2026-08-10T08:00:00.000Z"
 *                       bookings:
 *                         - id: 22
 *                           appointment_id: 8
 *                           user_id: 44
 *                           first_name: أحمد
 *                           last_name: الخالد
 *                           father_name: محمود
 *                           mother_name: فاطمة
 *                           national_id: "01012345678"

 *                           phone_number: "0912345678"
 *                           identity_image_path: /uploads/1723640000000-id.jpg
 *                           reason: مراجعة وثائق الشهادة
 *                           status: approved
 *                           status_label: موافق عليها
 *                           queue_order: 1
 *                           attended: null
 *                           decision_note: تمت الموافقة — يرجى الحضور قبل الموعد بربع ساعة
 *                           decided_by: 5
 *                           decided_at: "2026-08-14T11:00:00.000Z"
 *                           created_at: "2026-08-14T10:00:00.000Z"
 *                           updated_at: "2026-08-14T11:00:00.000Z"
 *                         - id: 23
 *                           appointment_id: 8
 *                           user_id: 51
 *                           first_name: سارة
 *                           last_name: الحسن
 *                           father_name: علي
 *                           mother_name: منى
 *                           national_id: "01098765432"

 *                           phone_number: "0987654321"
 *                           identity_image_path: /uploads/1723641111111-id.jpg
 *                           reason: استلام وثيقة
 *                           status: postponed
 *                           status_label: تم تأجيلها
 *                           queue_order: 2
 *                           attended: null
 *                           decision_note: تمت الموافقة
 *                           decided_by: 5
 *                           decided_at: "2026-08-14T11:10:00.000Z"
 *                           created_at: "2026-08-14T10:20:00.000Z"
 *                           updated_at: "2026-08-14T15:00:00.000Z"
 *               pending:
 *                 summary: filter=pending
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب مواعيد الإدارة
 *                   data:
 *                     - id: 8
 *                       appointment_date: "2026-09-01"
 *                       start_time: "09:00:00"
 *                       end_time: "11:00:00"
 *                       capacity: 5
 *                       approved_taken: 2
 *                       remaining_seats: 3
 *                       is_active: true
 *                       created_by: 5
 *                       created_at: "2026-08-10T08:00:00.000Z"
 *                       updated_at: "2026-08-10T08:00:00.000Z"
 *                       bookings:
 *                         - id: 21
 *                           appointment_id: 8
 *                           user_id: 44
 *                           first_name: أحمد
 *                           last_name: الخالد
 *                           father_name: محمود
 *                           mother_name: فاطمة
 *                           national_id: "01012345678"

 *                           phone_number: "0912345678"
 *                           identity_image_path: /uploads/1723640000000-id.jpg
 *                           reason: مراجعة وثائق الشهادة
 *                           status: pending
 *                           status_label: بانتظار الموافقة
 *                           queue_order: null
 *                           attended: null
 *                           decision_note: null
 *                           decided_by: null
 *                           decided_at: null
 *                           created_at: "2026-08-14T10:00:00.000Z"
 *                           updated_at: "2026-08-14T10:00:00.000Z"
 *               past:
 *                 summary: filter=past
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب مواعيد الإدارة
 *                   data:
 *                     - id: 3
 *                       appointment_date: "2026-08-01"
 *                       start_time: "09:00:00"
 *                       end_time: "11:00:00"
 *                       capacity: 5
 *                       approved_taken: 2
 *                       remaining_seats: 3
 *                       is_active: true
 *                       created_by: 5
 *                       created_at: "2026-07-20T08:00:00.000Z"
 *                       updated_at: "2026-07-20T08:00:00.000Z"
 *                       bookings:
 *                         - id: 10
 *                           appointment_id: 3
 *                           user_id: 44
 *                           first_name: أحمد
 *                           last_name: الخالد
 *                           father_name: محمود
 *                           mother_name: فاطمة
 *                           national_id: "01012345678"

 *                           phone_number: "0912345678"
 *                           identity_image_path: /uploads/id-old.jpg
 *                           reason: مراجعة وثائق
 *                           status: approved
 *                           status_label: موافق عليها
 *                           queue_order: 1
 *                           attended: true
 *                           decision_note: تمت الموافقة
 *                           decided_by: 5
 *                           decided_at: "2026-07-25T11:00:00.000Z"
 *                           created_at: "2026-07-21T10:00:00.000Z"
 *                           updated_at: "2026-08-01T12:00:00.000Z"
 *       400:
 *         description: فلتر غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 400
 *               message: filter يجب أن يكون approved أو pending أو past
 *               error: filter يجب أن يكون approved أو pending أو past
 *               data: null
 *       403:
 *         description: لا توجد صلاحية
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentErrorForbidden'
 */
router.get(
  '/manage',
  authMiddleware,
  authorize('APPOINTMENT_MANAGE'),
  listManaged
)

/**
 * @swagger
 * /api/appointments/slots/{id}:
 *   put:
 *     summary: تعديل موعد (مع إشعار وتأجيل للحجوزات الموافق عليها)
 *     description: |
 *       صلاحية الموظف `APPOINTMENT_MANAGE`.
 *       إذا تغيّر التاريخ أو وقت البداية/النهاية:
 *       - الحجوزات `approved` تتحول إلى `postponed`
 *       - يُرسل إشعار لأصحاب الحجوزات الموافق عليها/المؤجلة: من الموعد السابق إلى الموعد الجديد
 *       لا يمكن تقليل `capacity` لأقل من عدد الحجوزات الموافق عليها + المؤجلة.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, example: 8 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentSlotUpdate'
 *           examples:
 *             reschedule:
 *               summary: تأجيل التاريخ والوقت
 *               value:
 *                 appointment_date: "2026-09-03"
 *                 start_time: "10:00"
 *                 end_time: "12:00"
 *                 capacity: 5
 *                 is_active: true
 *             capacity_only:
 *               summary: زيادة السعة فقط (بدون تأجيل)
 *               value:
 *                 appointment_date: "2026-09-01"
 *                 start_time: "09:00"
 *                 end_time: "11:00"
 *                 capacity: 8
 *                 is_active: true
 *     responses:
 *       200:
 *         description: تم تعديل الموعد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم تعديل الموعد
 *               data:
 *                 id: 8
 *                 appointment_date: "2026-09-03"
 *                 start_time: "10:00:00"
 *                 end_time: "12:00:00"
 *                 capacity: 5
 *                 approved_taken: 2
 *                 remaining_seats: 3
 *                 is_active: true
 *                 created_by: 5
 *                 created_at: "2026-08-10T08:00:00.000Z"
 *                 updated_at: "2026-08-14T16:20:00.000Z"
 *       400:
 *         description: سعة أقل من الحجوزات الحالية أو بيانات غير صالحة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 400
 *               message: لا يمكن تقليل السعة إلى أقل من الحجوزات الموافق عليها حالياً (2)
 *               error: لا يمكن تقليل السعة إلى أقل من الحجوزات الموافق عليها حالياً (2)
 *               data: null
 *       404:
 *         description: الموعد غير موجود
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 404
 *               message: الموعد غير موجود
 *               error: الموعد غير موجود
 *               data: null
 */
router.put(
  '/slots/:id',
  authMiddleware,
  authorize('APPOINTMENT_MANAGE'),
  updateSlot
)

/**
 * @swagger
 * /api/appointments/slots/{id}:
 *   delete:
 *     summary: حذف موعد وإشعار المحجوزين الموافق عليهم
 *     description: |
 *       صلاحية الموظف `APPOINTMENT_MANAGE`.
 *       يُرسل إشعار إلغاء لكل حجز `approved` أو `postponed` ثم يُحذف الموعد (CASCADE للحجوزات).
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 8
 *     responses:
 *       200:
 *         description: تم الحذف
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 status_code: { type: integer, example: 200 }
 *                 message: { type: string, example: تم حذف الموعد وإشعار المحجوزين الموافق عليهم }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 8 }
 *                     deleted: { type: boolean, example: true }
 *                     notified: { type: integer, example: 2, description: عدد المحجوزين الذين أُرسل لهم إشعار }
 *             examples:
 *               deleted_with_notify:
 *                 summary: حذف مع إشعار لمحجوزَين
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم حذف الموعد وإشعار المحجوزين الموافق عليهم
 *                   data:
 *                     id: 8
 *                     deleted: true
 *                     notified: 2
 *               deleted_no_bookings:
 *                 summary: حذف موعد بلا حجوزات موافق عليها
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم حذف الموعد وإشعار المحجوزين الموافق عليهم
 *                   data:
 *                     id: 8
 *                     deleted: true
 *                     notified: 0
 *       404:
 *         description: الموعد غير موجود
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 404
 *               message: الموعد غير موجود
 *               error: الموعد غير موجود
 *               data: null
 *       403:
 *         description: لا توجد صلاحية
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentErrorForbidden'
 */
router.delete(
  '/slots/:id',
  authMiddleware,
  authorize('APPOINTMENT_MANAGE'),
  deleteSlot
)

/**
 * @swagger
 * /api/appointments/bookings:
 *   post:
 *     summary: حجز موعد (مواطن أو موظف)
 *     description: |
 *       صلاحية المواطن `APPOINTMENT_BOOK` أو الموظف `APPOINTMENT_BOOK_EMPLOYEE`.
 *       `multipart/form-data` مع صورة الهوية.
 *       الرقم الوطني أرقام فقط وبحد أقصى 11 خانة.
 *       الحجز يُنشأ بحالة `pending` ولا يحجز المقعد إلا بعد الموافقة.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - appointment_id
 *               - first_name
 *               - last_name
 *               - father_name
 *               - mother_name
 *               - national_id
 *               - phone_number
 *               - reason
 *               - identity_image
 *             properties:
 *               appointment_id: { type: integer, example: 8 }
 *               first_name: { type: string, example: أحمد }
 *               last_name: { type: string, example: الخالد }
 *               father_name: { type: string, example: محمود }
 *               mother_name: { type: string, example: فاطمة }
 *               national_id: { type: string, maxLength: 11, example: "01012345678" }
 *               phone_number: { type: string, maxLength: 10, example: "0912345678", description: "يبدأ بـ 09 ويتكون من 10 أرقام" }
 *               reason: { type: string, example: مراجعة وثائق الشهادة }
 *               identity_image:
 *                 type: string
 *                 format: binary
 *           encoding:
 *             identity_image:
 *               contentType: image/jpeg
 *     responses:
 *       201:
 *         description: تم إرسال طلب الحجز
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentBookingCreatedEnvelope'
 *             example:
 *               success: true
 *               status_code: 201
 *               message: تم إرسال طلب الحجز بنجاح
 *               data:
 *                 id: 21
 *                 appointment_id: 8
 *                 user_id: 44
 *                 first_name: أحمد
 *                 last_name: الخالد
 *                 father_name: محمود
 *                 mother_name: فاطمة
 *                 national_id: "01012345678"

 *                 phone_number: "0912345678"
 *                 identity_image_path: /uploads/1723640000000-id.jpg
 *                 reason: مراجعة وثائق الشهادة
 *                 status: pending
 *                 status_label: بانتظار الموافقة
 *                 queue_order: null
 *                 attended: null
 *                 decision_note: null
 *                 decided_by: null
 *                 decided_at: null
 *                 created_at: "2026-08-14T10:00:00.000Z"
 *                 updated_at: "2026-08-14T10:00:00.000Z"
 *       400:
 *         description: فالديشن فشل
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               national_id:
 *                 summary: رقم وطني أطول من 11
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: الرقم الوطني يجب أن يكون أرقاماً فقط وبحد أقصى 11 رقماً
 *                   error: الرقم الوطني يجب أن يكون أرقاماً فقط وبحد أقصى 11 رقماً
 *                   data: null
 *               phone_number:
 *                 summary: رقم هاتف غير صالح
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: رقم الهاتف يجب أن يبدأ بـ 09 ويتكون من 10 أرقام
 *                   error: رقم الهاتف يجب أن يبدأ بـ 09 ويتكون من 10 أرقام
 *                   data: null
 *               missing_image:
 *                 summary: بدون صورة الهوية
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: صورة الهوية مطلوبة
 *                   error: صورة الهوية مطلوبة
 *                   data: null
 *       409:
 *         description: تعارض (فترة ممتلئة أو حجز مكرر)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               full:
 *                 summary: لا توجد مقاعد
 *                 value:
 *                   success: false
 *                   status_code: 409
 *                   message: عذراً لقد تم حجز كل الأوقات خلال هذه الفترة
 *                   error: عذراً لقد تم حجز كل الأوقات خلال هذه الفترة
 *                   data: null
 *               duplicate:
 *                 summary: حجز نشط موجود
 *                 value:
 *                   success: false
 *                   status_code: 409
 *                   message: لديك بالفعل طلب حجز قيد الانتظار أو موافق عليه لهذا الموعد
 *                   error: لديك بالفعل طلب حجز قيد الانتظار أو موافق عليه لهذا الموعد
 *                   data: null
 */
router.post(
  '/bookings',
  authMiddleware,
  authorize('APPOINTMENT_BOOK', 'APPOINTMENT_BOOK_EMPLOYEE'),
  runMulterUpload(uploadIdentityImage.single('identity_image')),
  book
)

/**
 * @swagger
 * /api/appointments/bookings/my:
 *   get:
 *     summary: حجوزاتي القادمة (مواطن) مع الحالة
 *     description: |
 *       صلاحية المواطن `APPOINTMENT_BOOK`.
 *       يعرض حجوزات المستخدم الحالي التي تاريخ موعدها اليوم أو بعده.
 *       الحالات:
 *       - `pending` بانتظار الموافقة
 *       - `approved` موافق عليها
 *       - `rejected` مرفوضة
 *       - `postponed` تم تأجيلها بعد تعديل الموعد
 *       فلترة اختيارية بـ `status`.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, postponed]
 *         examples:
 *           all:
 *             summary: كل الحالات
 *             value: ""
 *           pending:
 *             value: pending
 *           approved:
 *             value: approved
 *           rejected:
 *             value: rejected
 *           postponed:
 *             value: postponed
 *     responses:
 *       200:
 *         description: حجوزات المواطن
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 status_code: { type: integer, example: 200 }
 *                 message: { type: string, example: تم جلب حجوزاتك }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AppointmentBookingWithSlot'
 *             examples:
 *               all:
 *                 summary: بدون فلتر — كل الحالات
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب حجوزاتك
 *                   data:
 *                     - id: 21
 *                       appointment_id: 8
 *                       user_id: 44
 *                       first_name: أحمد
 *                       last_name: الخالد
 *                       father_name: محمود
 *                       mother_name: فاطمة
 *                       national_id: "01012345678"

 *                       phone_number: "0912345678"
 *                       identity_image_path: /uploads/1723640000000-id.jpg
 *                       reason: مراجعة وثائق الشهادة
 *                       status: pending
 *                       status_label: بانتظار الموافقة
 *                       queue_order: null
 *                       attended: null
 *                       decision_note: null
 *                       decided_by: null
 *                       decided_at: null
 *                       created_at: "2026-08-14T10:00:00.000Z"
 *                       updated_at: "2026-08-14T10:00:00.000Z"
 *                       appointment:
 *                         id: 8
 *                         appointment_date: "2026-09-01"
 *                         start_time: "09:00:00"
 *                         end_time: "11:00:00"
 *                         capacity: 5
 *                     - id: 22
 *                       appointment_id: 8
 *                       user_id: 44
 *                       first_name: أحمد
 *                       last_name: الخالد
 *                       father_name: محمود
 *                       mother_name: فاطمة
 *                       national_id: "01012345678"

 *                       phone_number: "0912345678"
 *                       identity_image_path: /uploads/1723640000000-id.jpg
 *                       reason: مراجعة وثائق الشهادة
 *                       status: approved
 *                       status_label: موافق عليها
 *                       queue_order: 1
 *                       attended: null
 *                       decision_note: تمت الموافقة — يرجى الحضور قبل الموعد بربع ساعة
 *                       decided_by: 5
 *                       decided_at: "2026-08-14T11:00:00.000Z"
 *                       created_at: "2026-08-14T10:00:00.000Z"
 *                       updated_at: "2026-08-14T11:00:00.000Z"
 *                       appointment:
 *                         id: 8
 *                         appointment_date: "2026-09-01"
 *                         start_time: "09:00:00"
 *                         end_time: "11:00:00"
 *                         capacity: 5
 *                     - id: 24
 *                       appointment_id: 9
 *                       user_id: 44
 *                       first_name: أحمد
 *                       last_name: الخالد
 *                       father_name: محمود
 *                       mother_name: فاطمة
 *                       national_id: "01012345678"

 *                       phone_number: "0912345678"
 *                       identity_image_path: /uploads/1723640000000-id.jpg
 *                       reason: مراجعة وثائق
 *                       status: rejected
 *                       status_label: مرفوضة
 *                       queue_order: null
 *                       attended: null
 *                       decision_note: صورة الهوية غير واضحة — يرجى إعادة الحجز بمرفق أوضح
 *                       decided_by: 5
 *                       decided_at: "2026-08-14T11:05:00.000Z"
 *                       created_at: "2026-08-14T10:30:00.000Z"
 *                       updated_at: "2026-08-14T11:05:00.000Z"
 *                       appointment:
 *                         id: 9
 *                         appointment_date: "2026-09-02"
 *                         start_time: "12:00:00"
 *                         end_time: "14:00:00"
 *                         capacity: 4
 *                     - id: 23
 *                       appointment_id: 10
 *                       user_id: 44
 *                       first_name: أحمد
 *                       last_name: الخالد
 *                       father_name: محمود
 *                       mother_name: فاطمة
 *                       national_id: "01012345678"

 *                       phone_number: "0912345678"
 *                       identity_image_path: /uploads/1723640000000-id.jpg
 *                       reason: استلام وثيقة
 *                       status: postponed
 *                       status_label: تم تأجيلها
 *                       queue_order: 2
 *                       attended: null
 *                       decision_note: تمت الموافقة
 *                       decided_by: 5
 *                       decided_at: "2026-08-14T11:10:00.000Z"
 *                       created_at: "2026-08-14T10:20:00.000Z"
 *                       updated_at: "2026-08-14T15:00:00.000Z"
 *                       appointment:
 *                         id: 10
 *                         appointment_date: "2026-09-03"
 *                         start_time: "10:00:00"
 *                         end_time: "12:00:00"
 *                         capacity: 5
 *               approved_only:
 *                 summary: ?status=approved
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب حجوزاتك
 *                   data:
 *                     - id: 22
 *                       appointment_id: 8
 *                       user_id: 44
 *                       first_name: أحمد
 *                       last_name: الخالد
 *                       father_name: محمود
 *                       mother_name: فاطمة
 *                       national_id: "01012345678"

 *                       phone_number: "0912345678"
 *                       identity_image_path: /uploads/1723640000000-id.jpg
 *                       reason: مراجعة وثائق الشهادة
 *                       status: approved
 *                       status_label: موافق عليها
 *                       queue_order: 1
 *                       attended: null
 *                       decision_note: تمت الموافقة — يرجى الحضور قبل الموعد بربع ساعة
 *                       decided_by: 5
 *                       decided_at: "2026-08-14T11:00:00.000Z"
 *                       created_at: "2026-08-14T10:00:00.000Z"
 *                       updated_at: "2026-08-14T11:00:00.000Z"
 *                       appointment:
 *                         id: 8
 *                         appointment_date: "2026-09-01"
 *                         start_time: "09:00:00"
 *                         end_time: "11:00:00"
 *                         capacity: 5
 *       400:
 *         description: status غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 400
 *               message: status يجب أن يكون pending أو approved أو rejected أو postponed
 *               error: status يجب أن يكون pending أو approved أو rejected أو postponed
 *               data: null
 */
router.get(
  '/bookings/my',
  authMiddleware,
  authorize('APPOINTMENT_BOOK'),
  listMyBookings
)

/**
 * @swagger
 * /api/appointments/bookings/my/past:
 *   get:
 *     summary: نفس حجوزاتي القادمة (مسار قديم — alias)
 *     description: |
 *       نفس `GET /api/appointments/bookings/my` — حجوزات المواطن من اليوم فما بعد مع الحالات.
 *       أُبقي للتوافق مع المسار السابق.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, postponed]
 *     responses:
 *       200:
 *         description: حجوزات المواطن
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentMyBookingsEnvelope'
 */
router.get(
  '/bookings/my/past',
  authMiddleware,
  authorize('APPOINTMENT_BOOK'),
  listMyBookings
)

/**
 * @swagger
 * /api/appointments/bookings/{bookingId}/decision:
 *   patch:
 *     summary: الموافقة أو رفض الحجز مع note (محتوى الإشعار)
 *     description: |
 *       صلاحية الموظف `APPOINTMENT_MANAGE`.
 *       `note` إلزامي في الموافقة والرفض وهو نص الإشعار الذي يُرسل لصاحب الحجز.
 *       عند الموافقة يُعطى `queue_order` = آخر ترتيب ضمن نفس الموعد + 1.
 *       إذا امتلأت السعة تُرجع 409.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer, example: 21 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentDecisionInput'
 *           examples:
 *             approve:
 *               summary: موافقة
 *               value:
 *                 decision: approved
 *                 note: تمت الموافقة — يرجى الحضور قبل الموعد بربع ساعة
 *             reject:
 *               summary: رفض
 *               value:
 *                 decision: rejected
 *                 note: صورة الهوية غير واضحة — يرجى إعادة الحجز بمرفق أوضح
 *     responses:
 *       200:
 *         description: تم اتخاذ القرار
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *             examples:
 *               approved:
 *                 summary: موافقة
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم اتخاذ قرار الحجز
 *                   data:
 *                     id: 21
 *                     appointment_id: 8
 *                     user_id: 44
 *                     first_name: أحمد
 *                     last_name: الخالد
 *                     father_name: محمود
 *                     mother_name: فاطمة
 *                     national_id: "01012345678"

 *                     phone_number: "0912345678"
 *                     identity_image_path: /uploads/1723640000000-id.jpg
 *                     reason: مراجعة وثائق الشهادة
 *                     status: approved
 *                     status_label: موافق عليها
 *                     queue_order: 3
 *                     attended: null
 *                     decision_note: تمت الموافقة — يرجى الحضور قبل الموعد بربع ساعة
 *                     decided_by: 5
 *                     decided_at: "2026-08-14T16:30:00.000Z"
 *                     created_at: "2026-08-14T10:00:00.000Z"
 *                     updated_at: "2026-08-14T16:30:00.000Z"
 *               rejected:
 *                 summary: رفض
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم اتخاذ قرار الحجز
 *                   data:
 *                     id: 21
 *                     appointment_id: 8
 *                     user_id: 44
 *                     first_name: أحمد
 *                     last_name: الخالد
 *                     father_name: محمود
 *                     mother_name: فاطمة
 *                     national_id: "01012345678"

 *                     phone_number: "0912345678"
 *                     identity_image_path: /uploads/1723640000000-id.jpg
 *                     reason: مراجعة وثائق الشهادة
 *                     status: rejected
 *                     status_label: مرفوضة
 *                     queue_order: null
 *                     attended: null
 *                     decision_note: صورة الهوية غير واضحة — يرجى إعادة الحجز بمرفق أوضح
 *                     decided_by: 5
 *                     decided_at: "2026-08-14T16:30:00.000Z"
 *                     created_at: "2026-08-14T10:00:00.000Z"
 *                     updated_at: "2026-08-14T16:30:00.000Z"
 *       400:
 *         description: الحجز ليس pending أو note ناقصة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               missing_note:
 *                 summary: بدون note
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: ملاحظة القرار (note) مطلوبة في الموافقة والرفض
 *                   error: ملاحظة القرار (note) مطلوبة في الموافقة والرفض
 *                   data: null
 *               not_pending:
 *                 summary: الحجز ليس قيد الانتظار
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: يمكن اتخاذ القرار فقط على الحجوزات قيد الانتظار
 *                   error: يمكن اتخاذ القرار فقط على الحجوزات قيد الانتظار
 *                   data: null
 *       409:
 *         description: السعة ممتلئة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentErrorFullSlot'
 *       404:
 *         description: الحجز غير موجود
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 404
 *               message: الحجز غير موجود
 *               error: الحجز غير موجود
 *               data: null
 */
router.patch(
  '/bookings/:bookingId/decision',
  authMiddleware,
  authorize('APPOINTMENT_MANAGE'),
  decideBooking
)

/**
 * @swagger
 * /api/appointments/bookings/{bookingId}/attendance:
 *   patch:
 *     summary: تحديث حالة الحضور (يوم الموعد أو بعده فقط)
 *     description: |
 *       صلاحية الموظف `APPOINTMENT_MANAGE`.
 *       يُسمح فقط للحجوزات `approved` أو `postponed`، وفي يوم الموعد أو بعده.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer, example: 22 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentAttendanceInput'
 *           examples:
 *             attended:
 *               summary: حضر
 *               value: { attended: true }
 *             absent:
 *               summary: لم يحضر
 *               value: { attended: false }
 *     responses:
 *       200:
 *         description: تم تحديث الحضور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم تحديث حالة الحضور
 *               data:
 *                 id: 22
 *                 appointment_id: 8
 *                 user_id: 44
 *                 first_name: أحمد
 *                 last_name: الخالد
 *                 father_name: محمود
 *                 mother_name: فاطمة
 *                 national_id: "01012345678"

 *                 phone_number: "0912345678"
 *                 identity_image_path: /uploads/1723640000000-id.jpg
 *                 reason: مراجعة وثائق الشهادة
 *                 status: approved
 *                 status_label: موافق عليها
 *                 queue_order: 1
 *                 attended: true
 *                 decision_note: تمت الموافقة — يرجى الحضور قبل الموعد بربع ساعة
 *                 decided_by: 5
 *                 decided_at: "2026-08-14T11:00:00.000Z"
 *                 created_at: "2026-08-14T10:00:00.000Z"
 *                 updated_at: "2026-09-01T12:00:00.000Z"
 *       400:
 *         description: قبل يوم الموعد أو حالة الحجز غير مناسبة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               too_early:
 *                 summary: قبل يوم الموعد
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: لا يمكن تعديل حالة الحضور إلا في يوم الموعد أو بعده
 *                   error: لا يمكن تعديل حالة الحضور إلا في يوم الموعد أو بعده
 *                   data: null
 *               not_approved:
 *                 summary: الحجز ليس موافقاً/مؤجلاً
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: يمكن تحديث الحضور فقط للحجوزات الموافق عليها أو المؤجلة
 *                   error: يمكن تحديث الحضور فقط للحجوزات الموافق عليها أو المؤجلة
 *                   data: null
 */
router.patch(
  '/bookings/:bookingId/attendance',
  authMiddleware,
  authorize('APPOINTMENT_MANAGE'),
  updateAttendance
)

/**
 * @swagger
 * /api/appointments/bookings/{bookingId}/past:
 *   delete:
 *     summary: حذف حجز منتهٍ بدون إشعار (موظف)
 *     description: |
 *       صلاحية الموظف `APPOINTMENT_MANAGE` — ليست لصاحب الحجز.
 *       يُسمح فقط إذا كان تاريخ الموعد **قبل اليوم**. لا يُرسل إشعار.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *         example: 10
 *     responses:
 *       200:
 *         description: تم الحذف بدون إشعار
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 status_code: { type: integer, example: 200 }
 *                 message: { type: string, example: تم حذف الحجز السابق بدون إشعار }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 10 }
 *                     deleted: { type: boolean, example: true }
 *                     notified: { type: boolean, example: false }
 *             examples:
 *               deleted:
 *                 summary: حذف حجز منتهٍ بدون إشعار
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم حذف الحجز السابق بدون إشعار
 *                   data:
 *                     id: 10
 *                     deleted: true
 *                     notified: false
 *       400:
 *         description: الموعد لم ينتهِ بعد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 400
 *               message: يُسمح بحذف الحجوزات المنتهية فقط (تاريخ الموعد قبل اليوم) وبدون إشعار
 *               error: يُسمح بحذف الحجوزات المنتهية فقط (تاريخ الموعد قبل اليوم) وبدون إشعار
 *               data: null
 *       404:
 *         description: الحجز غير موجود
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 404
 *               message: الحجز غير موجود
 *               error: الحجز غير موجود
 *               data: null
 */
router.delete(
  '/bookings/:bookingId/past',
  authMiddleware,
  authorize('APPOINTMENT_MANAGE'),
  deletePastBooking
)

module.exports = router
