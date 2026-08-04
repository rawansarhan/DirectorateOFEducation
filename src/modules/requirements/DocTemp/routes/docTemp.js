const express = require('express')

const router = express.Router()

const {
  createDocumentTemplate,
  updateDocumentTemplate,
  getAllActiveDocumentTemplates,
  getOneActiveDocumentTemplate,
  extractTemplateFieldsFromUpload,
  extractTemplateFieldsById
} = require('../controllers/docTempController')

const { uploadDocumentTemplate, runMulterUpload } = require('../../../../core/middleware/upload')
const { uploadFileLimiter } = require('../../../../core/security/rateLimitMiddleware')
const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: Document Templates
 *   description: Document Template Management APIs => (المسؤول التقني)
 */

/**
 * @swagger
 * /api/document-templates:
 *   post:
 *     summary: Create new document template
 *     description: |
 *       ينشئ قالباً باستخدام path و url المُرجَعين من POST /extract-fields
 *       (بدون رفع ملف مجدداً) + config_json.
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type_doc_id
 *               - path
 *               - url
 *               - config_json
 *             properties:
 *               name:
 *                 type: string
 *                 example: استمارة معاملة المواطن
 *               type_doc_id:
 *                 type: integer
 *                 example: 1
 *               path:
 *                 type: string
 *                 example: /uploads/1779540194357-518796726.pdf
 *                 description: من استجابة extract-fields
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: http://localhost:4000/uploads/1779540194357-518796726.pdf
 *                 description: من استجابة extract-fields — يجب أن يطابق path
 *               config_json:
 *                 $ref: '#/components/schemas/DocumentTemplateConfigJson'
 *
 *     responses:
 *       200:
 *         description: تم إنشاء القالب بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentTemplateCreateSuccessResponse'
 *
 *       400:
 *         description: خطأ في البيانات
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentTemplateErrorResponse'
 */
router.post(
  '/',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  createDocumentTemplate
)

// /**
//  * @swagger
//  * /api/document-templates/{id}:
//  *   put:
//  *     summary: Update document template config_json => (المسؤول التقني)
//  *     description: |
//  *       يحدّث config_json فقط.
//  *       **Body:** `form_id`, `form_name`, `widgets` (+ `pdf` اختياري)
//  *       **widget_type:** text_field | date_picker | dropdown | check_list فقط
//  *       يدعم widgets: text_field, date_picker, dropdown, check_list.
//  *     tags: [Document Templates]
//  *     security:
//  *       - bearerAuth: []
//  *
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         example: 1
//  *
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/DocumentTemplateConfigJson'
//  *
//  *     responses:
//  *       200:
//  *         description: تم تعديل القالب بنجاح
//  *
//  *       404:
//  *         description: القالب غير موجود
//  */
// router.put(
//   '/:id',
//   authMiddleware,
//   authorize('UPDATE_TEMPLATE'),
//   updateDocumentTemplate
// )

/**
 * @swagger
 * /api/document-templates:
 *   get:
 *     summary: Get all active document templates => (المسؤول التقني) (مع ترقيم صفحات وبحث)
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *         description: رقم الصفحة
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 70 }
 *         description: عدد العناصر في الصفحة
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: نص البحث في اسم القالب (name)
 *     responses:
 *       200:
 *         description: تم جلب القوالب بنجاح
 */
router.get(
  '/',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  getAllActiveDocumentTemplates
)

/**
 * @swagger
 * /api/document-templates/extract-fields:
 *   post:
 *     summary: استخراج أسماء إفراغات PDF (AcroForm) من ملف مرفوع
 *     description: |
 *       يقرأ حقول AcroForm من PDF مرفوع، يحفظ الملف في uploads،
 *       ويرجع أسماء الإفراغات مع path و url للملف.
 *
 *       **Dedup / quota / rate limit:** نفس آلية POST /api/transaction/files/upload.
 *       **key** (optional): معرّف السياق — افتراضي `document_template_extract`.
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: ملف PDF يحتوي حقول AcroForm
 *               key:
 *                 type: string
 *                 example: document_template_extract
 *                 description: اختياري — معرّف سياق الرفع (افتراضي document_template_extract)
 *     responses:
 *       200:
 *         description: تم استخراج أسماء الإفراغات بنجاح
 *       429:
 *         description: تجاوز حد الرفع (rate limit أو quota يومي)
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
 *                   example: تم استخراج أسماء إفراغات القالب بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     source:
 *                       type: string
 *                       example: upload
 *                     engine_type:
 *                       type: string
 *                       example: ACROFORM
 *                     field_count:
 *                       type: integer
 *                       example: 4
 *                     path:
 *                       type: string
 *                       example: /uploads/1779540194357-518796726.pdf
 *                     url:
 *                       type: string
 *                       example: http://localhost:4000/uploads/1779540194357-518796726.pdf
 *                     fields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: employee
 *                           pdf_field_type:
 *                             type: string
 *                             example: PDFTextField
 *                           widget_type:
 *                             type: string
 *                             example: text_field
 */
router.post(
  '/extract-fields',
  authMiddleware,
  uploadFileLimiter,
  runMulterUpload(uploadDocumentTemplate.single('file')),
  authorize('PROCESS_PUBLISH_MANAGE'),
  extractTemplateFieldsFromUpload
)

/**
 * @swagger
 * /api/document-templates/admin/{id}:
 *   get:
 *     summary: Get one active document template => (المسؤول التقني)
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: تم جلب القالب بنجاح
 *
 *       404:
 *         description: القالب غير موجود
 */
router.get(
  'admin/:id',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  getOneActiveDocumentTemplate
)
/**
 * @swagger
 * /api/document-templates/{id}:
 *   get:
 *     summary: Get one active document template => (المسؤول التقني)
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: تم جلب القالب بنجاح
 *
 *       404:
 *         description: القالب غير موجود
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('TASK_SIGNING'),
  getOneActiveDocumentTemplate
)
/**
 * @swagger
 * /api/document-templates/citizen/{id}:
 *   get:
 *     summary: Get one active document template => (المسؤول التقني)
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: تم جلب القالب بنجاح
 *
 *       404:
 *         description: القالب غير موجود
 */
router.get(
  '/citizen/:id',
  authMiddleware,
  authorize('TRANSACTION_SUBMIT'),
  getOneActiveDocumentTemplate
)
// /**
//  * @swagger
//  * /api/document-templates/{id}/fields:
//  *   get:
//  *     summary: استخراج أسماء إفراغات PDF لقالب محفوظ
//  *     description: يقرأ حقول AcroForm من ملف القالب المحفوظ
//  *     tags: [Document Templates]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         example: 1
//  *     responses:
//  *       200:
//  *         description: تم استخراج أسماء الإفراغات بنجاح
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 status_code:
//  *                   type: integer
//  *                   example: 200
//  *                 message:
//  *                   type: string
//  *                   example: تم استخراج أسماء إفراغات القالب بنجاح
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     source:
//  *                       type: string
//  *                       example: template
//  *                     engine_type:
//  *                       type: string
//  *                       example: ACROFORM
//  *                     field_count:
//  *                       type: integer
//  *                       example: 4
//  *                     fields:
//  *                       type: array
//  *                       items:
//  *                         type: object
//  *                         properties:
//  *                           id:
//  *                             type: string
//  *                             example: employee
//  *                           pdf_field_type:
//  *                             type: string
//  *                             example: PDFTextField
//  *                           widget_type:
//  *                             type: string
//  *                             example: text_field
//  *       404:
//  *         description: القالب غير موجود
//  */
// router.get(
//   '/:id/fields',
//   authMiddleware,
//   authorize('GET_ONE_TEMPLATE'),
//   extractTemplateFieldsById
// )

module.exports = router
