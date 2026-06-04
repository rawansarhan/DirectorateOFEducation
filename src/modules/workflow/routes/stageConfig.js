const express = require('express')
const router = express.Router()
const { authMiddleware ,authorize } = require('../../../core/middleware/authMiddleware')

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
 *                         عقد workflow (حقول/ملفات/قوالب/متغيرات).
 *                         لمرحلة SERVICE_TASK أضف actions هنا (GENERATE_PDF، SEND_EMAIL، …).
 *                       example:
 *                         fields:
 *                           - key: citizen_name
 *                             type: text
 *                             required: true
 *                         files:
 *                           - key: criminal_record
 *                             type: pdf
 *                             required: true
 *                         templates:
 *                           - template_id: 1
 *                         variables:
 *                           decision: over_50
 *                         requires_digital_signature: true
 *                         actions:
 *                           - name: GENERATE_PDF
 *                             payload:
 *                               template_id: 1
 *                           - name: SEND_EMAIL
 *                             payload:
 *                               message: "تم إصدار المستند"
 *
 *                     ui_json:
 *                       type: object
 *                       description: محجوز لاحقاً — يُرسل فارغاً
 *                       example: {}
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
 *                         example:
 *                           sla: 24
 *                           action: SEND_EMAIL
 *
 *                       assignments:
 *                         type: array
 *
 *                         items:
 *                           type: integer
 *
 *                         example: [5, 7]
 *
 *       400:
 *         description: بيانات غير صالحة (JSON، Joi، ui_json غير فارغ، …)
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
 *     summary: Get ui_json for process (AUTH stage) — عرض الأوراق/الحقول المطلوبة من المواطن (مواطن أو موظف)
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
 *                     ui_json:
 *                       type: object
 *                       example:
 *                         fields:
 *                           - key: citizen_name
 *                             type: text
 *                             required: true
 *                         files:
 *                           - key: criminal_record
 *                             type: pdf
 *                             required: true
 *                         templates:
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