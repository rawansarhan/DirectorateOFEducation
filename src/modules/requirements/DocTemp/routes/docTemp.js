const express = require('express')

const router = express.Router()

const {
  createDocumentTemplate,
  updateDocumentTemplate,
  getAllActiveDocumentTemplates,
  getOneActiveDocumentTemplate
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
 *               - config_json
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Template file (pdf, docx, html)
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
 *               config_json:
 *                 type: string
 *                 description: |
 *                   نص JSON — راجع schema DocumentTemplateConfigJson.
 *                   الحالات المدعومة في widgets:
 *                   1) text_field — حقل نص/هاتف (DocumentTemplateWidgetTextField)
 *                   2) date_picker — تاريخ (DocumentTemplateWidgetDatePicker)
 *                   3) dropdown — قائمة منسدلة (DocumentTemplateWidgetDropdown)
 *                 example: '{"form_id":"civil_transaction_55","form_name":"استمارة معاملة المواطن","widgets":[{"widget_type":"text_field","data":{"id":"citizen_phone","label":"رقم الموبايل","is_required":true,"input_type":"phone","regex":"^09[0-9]{8}$","max_length":10,"min_length":10}},{"widget_type":"date_picker","data":{"id":"birth_date","label":"تاريخ الولادة","is_required":true,"min_date":"1940-01-01","max_date":"2026-06-04"}},{"widget_type":"dropdown","data":{"id":"birth_governorate","label":"محافظة الولادة","is_required":true,"options":[{"key":"DAM","value":"دمشق"},{"key":"ALE","value":"حلب"}]}}]}'
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
 *     summary: Update document template => (المسؤول التقني)
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
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Template file
 *
 *               name:
 *                 type: string
 *                 example: Updated Template
 *
 *               type_doc_id:
 *                 type: integer
 *                 example: 1
 *
 *               config_json:
 *                 type: string
 *                 description: نص JSON — راجع DocumentTemplateConfigJson (text_field, date_picker, dropdown)
 *                 example: '{"form_id":"civil_transaction_55","form_name":"استمارة معاملة المواطن","widgets":[{"widget_type":"text_field","data":{"id":"citizen_phone","label":"رقم الموبايل","is_required":true,"input_type":"phone","regex":"^09[0-9]{8}$","max_length":10,"min_length":10}},{"widget_type":"date_picker","data":{"id":"birth_date","label":"تاريخ الولادة","is_required":true,"min_date":"1940-01-01","max_date":"2026-06-04"}},{"widget_type":"dropdown","data":{"id":"birth_governorate","label":"محافظة الولادة","is_required":true,"options":[{"key":"DAM","value":"دمشق"},{"key":"ALE","value":"حلب"}]}}]}'
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
  uploadDocumentTemplate.single('file'),
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
  getOneActiveDocumentTemplate
)

module.exports = router
