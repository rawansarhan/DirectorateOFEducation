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
 *               - file_type
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Template file
 *
 *               name:
 *                 type: string
 *                 example: Contract Template
 *
 *               file_type:
 *                 type: string
 *                 enum: [pdf, docx, html]
 *                 example: pdf
 *
 *               config_json:
 *                 type: object
 *                 example:
 *                   x: 100
 *                   y: 200
 *
 *     responses:
 *       201:
 *         description: تم إنشاء القالب بنجاح
 *
 *       400:
 *         description: خطأ في البيانات
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
 *               file_type:
 *                 type: string
 *                 enum: [pdf, docx, html]
 *                 example: docx
 *
 *               config_json:
 *                 type: object
 *                 example:
 *                   page: 1
 *                   x: 50
 *                   y: 80
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
  authorize('GET_ONE_TEMPLATE'),
  getOneActiveDocumentTemplate
)

module.exports = router
