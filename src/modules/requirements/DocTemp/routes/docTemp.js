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

const { uploadDocumentTemplate } = require('../../../../core/middleware/upload')
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
 *       يرفع ملف PDF فقط مع name و type_doc_id.
 *       config_json يُضاف لاحقاً عبر PUT /api/document-templates/{id}.
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
 *               - name
 *               - type_doc_id
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: ملف PDF للقالب (AcroForm)
 *
 *               name:
 *                 type: string
 *                 example: استمارة معاملة المواطن
 *
 *               type_doc_id:
 *                 type: integer
 *                 example: 1
 *                 description: معرّف نوع الوثيقة من جدول type_docs
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
  uploadDocumentTemplate.single('file'),
  authMiddleware,
  authorize('CREATE_TEMPLATE'),
  createDocumentTemplate
)

/**
 * @swagger
 * /api/document-templates/{id}:
 *   put:
 *     summary: Update document template config_json => (المسؤول التقني)
 *     description: |
 *       يحدّث config_json فقط (form_id, form_name, widgets).
 *       يدعم widgets: text_field, date_picker, dropdown, check_list.
 *       name و file و type_doc_id تبقى كما هي من القالب الأصلي.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentTemplateConfigJson'
 *
 *     responses:
 *       200:
 *         description: تم تعديل القالب بنجاح
 *
 *       404:
 *         description: القالب غير موجود
 */
router.put(
  '/:id',
  authMiddleware,
  authorize('UPDATE_TEMPLATE'),
  updateDocumentTemplate
)

/**
 * @swagger
 * /api/document-templates:
 *   get:
 *     summary: Get all active document templates => (المسؤول التقني)
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: تم جلب القوالب بنجاح
 */
router.get(
  '/',
  authMiddleware,
  authorize('GET_ALL_TEMPLATE'),
  getAllActiveDocumentTemplates
)

/**
 * @swagger
 * /api/document-templates/extract-fields:
 *   post:
 *     summary: استخراج أسماء إفراغات PDF (AcroForm) من ملف مرفوع
 *     description: |
 *       يقرأ الحقول الداخلية في PDF (مثل manager-name, employee, job, department)
 *       وليس تسميات الشاشة. مفيد قبل إنشاء config_json عند رفع قالب جديد.
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
 *     responses:
 *       200:
 *         description: تم استخراج أسماء الإفراغات بنجاح
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
  uploadDocumentTemplate.single('file'),
  authMiddleware,
  authorize('CREATE_TEMPLATE'),
  extractTemplateFieldsFromUpload
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
  authorize('GET_ONE_TEMPLATE'),
  getOneActiveDocumentTemplate
)

/**
 * @swagger
 * /api/document-templates/{id}/fields:
 *   get:
 *     summary: استخراج أسماء إفراغات PDF لقالب محفوظ
 *     description: يقرأ حقول AcroForm من ملف القالب المحفوظ
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: تم استخراج أسماء الإفراغات بنجاح
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
 *                       example: template
 *                     engine_type:
 *                       type: string
 *                       example: ACROFORM
 *                     field_count:
 *                       type: integer
 *                       example: 4
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
 *       404:
 *         description: القالب غير موجود
 */
router.get(
  '/:id/fields',
  authMiddleware,
  authorize('GET_ONE_TEMPLATE'),
  extractTemplateFieldsById
)

module.exports = router
