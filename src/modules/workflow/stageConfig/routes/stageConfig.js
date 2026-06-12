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
 *                       - to (مطلوب أحدها): organization_department_roles_id لإرسال لموظفي الدور
 *                       - to_camunda_group_key (مطلوب أحدها): AUTH لإرسال لصاحب المعاملة
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
 *                         template:
 *                           - template_id: 1
 *       400:
 *         description: خطأ في الطلب (ID غير صحيح أو مفقود)
 *       404:
 *         description: لم يتم العثور على المرحلة أو الإعدادات
 *       500:
 *         description: خطأ داخلي في السيرفر
 */
router.get(
  '/config/:id',
  authMiddleware,
  getJsonProcess
)
module.exports = router
