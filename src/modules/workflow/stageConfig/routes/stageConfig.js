const express = require('express')
const router = express.Router()
const { authMiddleware ,authorize } = require('../../../../core/middleware/authMiddleware')

const {
  createStageConfig,
  getJsonProcess,
  getComplaintConfigController
} = require('../controllers/stageConfigController')
/**
 * @swagger
 * /api/stage_config/create:
 *   post:
 *     summary: Create bulk stage configurations + stage_assignments => (المسؤول التقني)
 *     description: |
 *       ينشئ `stage_config` لعدة مراحل مع `assignments` (stage_assignments).
 *
 *       **date_picker — min_date / max_date:**
 *       - `YYYY-MM-DD` ثابت (السلوك القديم)
 *       - `"today"` أو `{ type: today }`
 *       - `{ type: relative, years, months, days }` (سالب = قبل اليوم)
 *       انظر المثال `with_date_picker_all_bounds` لكل الحالات.
 *
 *       **SEND_NOTIFICATION payload:**
 *       - `message` (مطلوب)
 *       - `title` (اختياري)
 *       - `type` (اختياري): نوع الإشعار في جدول notifications
 *       - أحد الأهداف: `to` (user_id → WebSocket) أو `to_camunda_group_key: AUTH` (صاحب المعاملة: مواطن→Firebase / موظف→WebSocket)
 *         أو `(organization_id, department_id, role_id)` لموظفي الدور (WebSocket)
 *     tags: [Stage Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stages
 *             properties:
 *               stages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - stage_id
 *                     - config_json
 *                   properties:
 *                     stage_id:
 *                       type: integer
 *                       example: 1
 *                     config_json:
 *                       type: object
 *                       description: |
 *                         عقد الاستمارة: form_id, form_name, widgets, template, actions, is_assignment, …
 *                         is_assignment يُحفظ داخل config_json فقط (مثل widgets/template) ولا يغيّر سلوك assignments.
 *                         type_doc_id مطلوب فقط داخل file_picker.
 *                         employee_picker: اختيار بطاقة ذاتية؛ الخيارات من GET /api/self-cards/search.
 *                         القيمة = `{ self_card_id }` إلزامي، و`path_self_card` اختياري (PDF للسيرة الذاتية).
 *                         لمرحلة SERVICE_TASK أضف actions (GENERATE_PDF، SEND_NOTIFICATION، SYNC_SELF_CARD، …) — بدون assignments.
 *                       example:
 *                         form_id: civil_transaction_55
 *                         form_name: استمارة معاملة المواطن
 *                         widgets:
 *                           - widget_type: text_field
 *                             data:
 *                               id: citizen_phone
 *                               label: رقم الموبايل
 *                               is_required: true
 *                               input_type: phone
 *                               regex: "^09[0-9]{8}$"
 *                               max_length: 10
 *                               min_length: 10
 *                           - widget_type: file_picker
 *                             data:
 *                               id: national_id_files
 *                               label: وثائق الهوية الشخصية
 *                               is_required: true
 *                               max_size_mb: 5
 *                               allowed_extensions: ["pdf", "png", "jpg"]
 *                               allow_multiple: true
 *                               type_doc_id: 1
 *                         template:
 *                           - template_id: 1
 *                         requires_digital_signature: true
 *                         is_assignment: false
 *                         actions:
 *                           - name: GENERATE_PDF
 *                             payload:
 *                               template_id: 1
 *                           - name: SEND_EMAIL
 *                             payload:
 *                               message: تم إصدار المستند
 *                           - name: SEND_NOTIFICATION
 *                             payload:
 *                               title: تم إصدار المستند
 *                               message: تم إصدار مستند معاملتك بنجاح
 *                               to: 12
 *                               type: document_issued
 *                           - name: SEND_NOTIFICATION
 *                             payload:
 *                               title: إشعار للمواطن
 *                               message: تم تحديث حالة معاملتك
 *                               to_camunda_group_key: AUTH
 *                               type: workflow_notification
 *                     assignments:
 *                       type: array
 *                       description: |
 *                         مطلوب لـ USER_TASK فقط — يُحفظ في stage_assignments (نفس السلوك سواء is_assignment true أو false).
 *                         يجب أن تكون على مستوى المرحلة (sibling لـ config_json) وليس داخل config_json.
 *                         لا تُرسل لـ SERVICE_TASK.
 *                         مثال: `[{ organization_id, department_id, role_id }]`
 *                         أو CITIZEN: `[{ organization_id: null, department_id: null, role_id: null }]`
 *                         ملاحظة: إن وُضعت مصفوفة ODR داخل config_json.assignments بالخطأ تُرفع تلقائياً إلى assignments.
 *                       items:
 *                         type: object
 *                         required:
 *                           - organization_id
 *                           - department_id
 *                           - role_id
 *                         properties:
 *                           organization_id:
 *                             type: integer
 *                             nullable: true
 *                             example: 1
 *                           department_id:
 *                             type: integer
 *                             nullable: true
 *                             example: 2
 *                           role_id:
 *                             type: integer
 *                             nullable: true
 *                             example: 3
 *           examples:
 *             with_dynamic_assignment:
 *               summary: USER_TASK مع is_assignment=true — assignments تُحفظ كالمعتاد
 *               value:
 *                 stages:
 *                   - stage_id: 2
 *                     config_json:
 *                       form_id: leave_process_review
 *                       form_name: التشيك على المعلومات المدخلة
 *                       widgets:
 *                         - widget_type: radio_group
 *                           data:
 *                             id: decision
 *                             label: قرار الطلب
 *                             is_required: true
 *                             is_gateway: true
 *                             options:
 *                               - key: الطلب مرفوض
 *                                 value: الطلب مرفوض
 *                               - key: الطلب مقبول
 *                                 value: الطلب مقبول
 *                       template: []
 *                       requires_digital_signature: true
 *                       is_assignment: true
 *                     assignments:
 *                       - organization_id: 1
 *                         department_id: 2
 *                         role_id: 3
 *             with_static_assignment:
 *               summary: USER_TASK مع is_assignment=false — نفس حفظ assignments
 *               value:
 *                 stages:
 *                   - stage_id: 3
 *                     config_json:
 *                       form_id: leave_process_sign
 *                       form_name: توقيع مدير التربية
 *                       widgets: []
 *                       template: []
 *                       is_assignment: false
 *                     assignments:
 *                       - organization_id: 1
 *                         department_id: 3
 *                         role_id: 2
 *             with_date_picker_all_bounds:
 *               summary: date_picker — مطلق + today + relative (سنوات/أشهر/أيام)
 *               description: |
 *                 min_date / max_date يقبلان:
 *                 - YYYY-MM-DD ثابت (السلوك القديم)
 *                 - "today" أو { type: today }
 *                 - { type: relative, years, months, days }  (سالب=قبل اليوم)
 *                 عند عرض الاستمارة تُحسب إلى YYYY-MM-DD حسب تاريخ اليوم.
 *               value:
 *                 stages:
 *                   - stage_id: 1
 *                     config_json:
 *                       form_id: civil_dates_demo
 *                       form_name: استمارة حدود التاريخ (شامل)
 *                       widgets:
 *                         - widget_type: date_picker
 *                           data:
 *                             id: birth_date
 *                             label: تاريخ الولادة
 *                             is_required: true
 *                             min_date: "1900-01-01"
 *                             max_date: today
 *                         - widget_type: date_picker
 *                           data:
 *                             id: adult_birth_date
 *                             label: تاريخ ولادة (عمر ≥ 18)
 *                             is_required: true
 *                             min_date:
 *                               type: relative
 *                               years: -120
 *                               months: 0
 *                               days: 0
 *                             max_date:
 *                               type: relative
 *                               years: -18
 *                               months: 0
 *                               days: 0
 *                         - widget_type: date_picker
 *                           data:
 *                             id: window_months
 *                             label: نافذة أشهر حول اليوم
 *                             is_required: true
 *                             min_date:
 *                               type: relative
 *                               years: 0
 *                               months: -4
 *                               days: 0
 *                             max_date:
 *                               type: relative
 *                               years: 0
 *                               months: 7
 *                               days: 0
 *                         - widget_type: date_picker
 *                           data:
 *                             id: window_years
 *                             label: قبل 5 سنوات → بعد 10 سنوات
 *                             is_required: false
 *                             min_date:
 *                               type: relative
 *                               years: -5
 *                             max_date:
 *                               type: relative
 *                               years: 10
 *                         - widget_type: date_picker
 *                           data:
 *                             id: last_30_days
 *                             label: خلال آخر 30 يوماً
 *                             is_required: false
 *                             min_date:
 *                               type: relative
 *                               days: -30
 *                             max_date:
 *                               type: today
 *                         - widget_type: date_picker
 *                           data:
 *                             id: mixed_units
 *                             label: مزيج وحدات (سنة+شهر+يوم)
 *                             is_required: false
 *                             min_date:
 *                               type: relative
 *                               years: -1
 *                               months: -2
 *                               days: -3
 *                             max_date:
 *                               type: relative
 *                               months: 6
 *                               days: 10
 *                         - widget_type: date_picker
 *                           data:
 *                             id: from_today_forward
 *                             label: من اليوم فصاعداً (سنة)
 *                             is_required: false
 *                             min_date:
 *                               type: today
 *                             max_date:
 *                               type: relative
 *                               years: 1
 *                         - widget_type: date_picker
 *                           data:
 *                             id: fixed_period
 *                             label: فترة إدارية ثابتة
 *                             is_required: true
 *                             min_date: "2026-09-01"
 *                             max_date: "2026-09-30"
 *                         - widget_type: date_picker
 *                           data:
 *                             id: absolute_and_today
 *                             label: مطلق + اليوم
 *                             is_required: false
 *                             min_date: "2020-01-01"
 *                             max_date:
 *                               type: today
 *                       template: []
 *                       is_assignment: false
 *                     assignments:
 *                       - organization_id: null
 *                         department_id: null
 *                         role_id: null
 *     responses:
 *       200:
 *         description: تم إعداد المراحل بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: تم إعداد المراحل بنجاح
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       stage_id:
 *                         type: integer
 *                         example: 1
 *                       config:
 *                         type: object
 *       400:
 *         description: بيانات غير صالحة (JSON، Joi، widgets، …)
 *       409:
 *         description: إعدادات المرحلة موجودة مسبقاً
 */
router.post(
  '/create',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  createStageConfig
)
 /**
 * @swagger
 * /api/stage_config/config/complaint:
 *   get:
 *     summary: استمارة تقديم الشكوى النشطة (AUTH stage)
 *     description: |
 *       يجلب `config_json` لمرحلة AUTH الخاصة بعملية الشكوى النشطة الوحيدة
 *       (`is_complaint=true` و `is_active=true`).
 *       مع Redis cache (TTL = API_CACHE_TTL_SECONDS).
 *
 *       يتحقق أن `stageAssignment` يطابق أدوار المستخدم الحالي (التحقق خارج الكاش).
 *       إن وُجد `assignments` يُحذف من الاستجابة للمواطن، بينما `is_assignment` يُعاد كما هو.
 *     tags: [Complaint]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم جلب استمارة الشكوى بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: تم جلب استمارة الشكوى بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     process_definition_id:
 *                       type: integer
 *                       example: 12
 *                     process_name:
 *                       type: string
 *                       example: شكوى مواطن
 *                     process_code:
 *                       type: string
 *                       example: COMPLAINT_01
 *                     config_json:
 *                       type: object
 *       401:
 *         description: غير مصادق
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: دور المستخدم غير مطابق لتعيينات مرحلة التقديم
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 403
 *               message: ليس لديك صلاحية تقديم شكوى — دورك غير مطابق لتعيينات مرحلة التقديم
 *               error: FORBIDDEN
 *               data: null
 *       404:
 *         description: لا توجد شكوى نشطة أو مرحلة AUTH أو استمارة غير مكوّنة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               no_active_complaint:
 *                 summary: لا توجد شكوى نشطة
 *                 value:
 *                   success: false
 *                   status_code: 404
 *                   message: لا توجد شكوى نشطة حالياً
 *                   error: NOT_FOUND
 *                   data: null
 *               auth_stage_missing:
 *                 summary: لا توجد مرحلة AUTH
 *                 value:
 *                   success: false
 *                   status_code: 404
 *                   message: لا توجد مرحلة تقديم (AUTH) مرتبطة بعملية الشكوى
 *                   error: NOT_FOUND
 *                   data: null
 *       500:
 *         description: خطأ داخلي في السيرفر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/config/complaint',
  authMiddleware,
  getComplaintConfigController
)

/**
 * @swagger
 * /api/stage_config/config/{id}:
 *   get:
 *     summary: Get config_json for process (AUTH stage) — استمارة التقديم للمواطن
 *     description: |
 *       يجلب استمارة التقديم من مرحلة AUTH:
 *       - يُعاد `stageConfig.config_json` (القالب) بنفس شكل الرد السابق
 *       - إن وُجد `assignments` يُحذف من الاستجابة (أما `is_assignment` فيُعاد)
 *       - يتحقق أن `organization_department_roles_id` في `stage_assignments`
 *         لمرحلة AUTH موجود أيضاً في `user_role_assignments` لصاحب التوكن
 *       - التحقق خارج الكاش؛ الكاش يخزّن القالب فقط مع معرفات التعيين الداخلية
 *     tags: [Stage Config]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: Process Definition ID
 *     responses:
 *       200:
 *         description: تم جلب إعدادات العملية بنجاح.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: تم جلب إعدادات العملية بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     config_json:
 *                       type: object
 *                       description: بيانات المسودة أو قالب stage_config
 *                     transaction_id:
 *                       type: integer
 *                       description: معرّف المسودة — يُعاد فقط عند وجود draft
 *                       example: 441
 *                   example:
 *                     transaction_id: 441
 *                     config_json:
 *                       form_id: civil_transaction_55
 *                       form_name: استمارة معاملة المواطن
 *                       widgets:
 *                         - widget_type: text_field
 *                           data:
 *                             id: citizen_phone
 *                             label: رقم الموبايل
 *                             is_required: true
 *                             input_type: phone
 *                       template:
 *                         - template_id: 1
 *       400:
 *         description: معرّف العملية غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 400
 *               message: معرّف العملية غير صالح — يجب أن يكون رقماً صحيحاً موجباً
 *               error: VALIDATION_ERROR
 *               data: null
 *       401:
 *         description: غير مصادق — Bearer token مفقود أو غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 401
 *               message: Unauthorized
 *               error: UNAUTHORIZED
 *               data: null
 *       403:
 *         description: المستخدم غير مخوّل للتقديم على هذه المعاملة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 403
 *               message: هذه المعاملة غير مخول لك التقديم عليها
 *               error: FORBIDDEN
 *               data: null
 *       404:
 *         description: العملية أو مرحلة AUTH أو استمارة التقديم غير موجودة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               process_not_found:
 *                 summary: تعريف العملية غير موجود
 *                 value:
 *                   success: false
 *                   status_code: 404
 *                   message: تعريف العملية غير موجود — تحقق من معرّف العملية
 *                   error: NOT_FOUND
 *                   data: null
 *               auth_stage_missing:
 *                 summary: لا توجد مرحلة AUTH
 *                 value:
 *                   success: false
 *                   status_code: 404
 *                   message: لا توجد مرحلة تقديم (AUTH) مرتبطة بهذه العملية
 *                   error: NOT_FOUND
 *                   data: null
 *               form_not_configured:
 *                 summary: الاستمارة غير مكوّنة
 *                 value:
 *                   success: false
 *                   status_code: 404
 *                   message: لم تُكوَّن استمارة التقديم لهذه العملية بعد
 *                   error: NOT_FOUND
 *                   data: null
 *       500:
 *         description: خطأ داخلي في السيرفر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example:
 *               success: false
 *               status_code: 500
 *               message: Internal Server Error
 *               error: INTERNAL_ERROR
 *               data: null
 */
router.get(
  '/config/:id',
  authMiddleware,
  getJsonProcess
)
module.exports = router
