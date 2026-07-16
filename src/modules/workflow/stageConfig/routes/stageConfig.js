const express = require('express')
const router = express.Router()
const { authMiddleware ,authorize } = require('../../../../core/middleware/authMiddleware')

const { createStageConfig , getJsonProcess} = require('../controllers/stageConfigController')
/**
 * @swagger
 * /api/stage_config/create:
 *   post:
 *     summary: Create bulk stage configurations=> (المسؤول التقني)
 *     tags: [Stage Config]
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stages
 *
 *             properties:
 *
 *               stages:
 *                 type: array
 *
 *                 items:
 *                   type: object
 *
 *                   required:
 *                     - stage_id
 *                     - config_json
 *
 *                   properties:
 *
 *                     stage_id:
 *                       type: integer
 *                       example: 1
 *
 *                     config_json:
 *                       type: object
 *                       description: |
 *                         عقد الاستمارة: form_id, form_name, widgets, template, actions.
 *                         widgets اختياري — [] أو أي عدد (text_field, file_picker, …).
 *                         type_doc_id مطلوب فقط داخل file_picker.
 *                         لمرحلة SERVICE_TASK أضف actions (GENERATE_PDF، SEND_EMAIL، …).
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
 *
 *                       SEND_NOTIFICATION payload للمسؤول التقني:
 *                       - message (مطلوب): نص الإشعار
 *                       - title (اختياري): عنوان الإشعار
 *                       - type (اختياري): نوع الإشعار في جدول notifications
 *                       - to (مطلوب أحدها): user_id مباشر — WebSocket دائماً (مثال: 12)
 *                       - to_camunda_group_key (مطلوب أحدها): AUTH لصاحب المعاملة — Firebase دائماً
 *                       - أو (organization_id, department_id, role_id) لموظفي الدور — WebSocket
 *
 *                     assignments:
 *                       type: array
 *
 *                       items:
 *                         type: object
 *
 *                         required:
 *                           - organization_id
 *                           - department_id
 *                           - role_id
 *
 *                         properties:
 *
 *                           organization_id:
 *                             type: integer
 *                             example: 1
 *
 *                           department_id:
 *                             type: integer
 *                             example: 2
 *
 *                           role_id:
 *                             type: integer
 *                             example: 3
 *
 *     responses:
 *       200:
 *         description: تم إعداد المراحل بنجاح
 *
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *
 *               properties:
 *
 *                 message:
 *                   type: string
 *                   example: "تم إعداد المراحل بنجاح"
 *
 *                 data:
 *                   type: array
 *
 *                   items:
 *                     type: object
 *
 *                     properties:
 *
 *                       stage_id:
 *                         type: integer
 *                         example: 1
 *
 *                       config:
 *                         type: object
 *
 *       400:
 *         description: بيانات غير صالحة (JSON، Joi، widgets، …)
 *       409:
 *         description: إعدادات المرحلة موجودة مسبقاً
 */
router.post(
  '/create',
  authMiddleware,
  authorize('STAGE_CONFIG_CREATE'),
  createStageConfig
)
 /**
 * @swagger
 * /api/stage_config/config/{id}:
 *   get:
 *     summary: Get config_json for process (AUTH stage) — استمارة التقديم للمواطن
 *     description: |
 *       يجلب استمارة التقديم للمواطن:
 *       - إن وُجدت **مسودة draft** للمستخدم على هذه العملية وفيها `transaction.data` → يُعاد محتواها في `config_json`
 *       - وإلا → يُعاد `stageConfig.config_json` (القالب الفارغ)
 *       - عند وجود مسودة يُضاف `transaction_id` لاستخدامه في `POST /api/transaction/submit/{transactionId}`
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
