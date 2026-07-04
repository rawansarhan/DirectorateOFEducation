'use strict'

const express = require('express')
const router = express.Router()

const {
  createFilePicker,
  getAllFilePickers,
  getFilePickerById
} = require('../controllers/filePickerController')

const {
  authMiddleware,
  authorize
} = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: FilePicker
 *   description: إدارة منتقيات الملفات (File Picker Widgets)
 */

/**
 * @swagger
 * /api/file-pickers:
 *   get:
 *     summary: جلب كل منتقيات الملفات
 *     tags: [FilePicker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم الجلب بنجاح
 */
router.get(
  '/',
  authMiddleware,
  authorize('REQUIREMENTS_READ_ALL'),
  getAllFilePickers
)

/**
 * @swagger
 * /api/file-pickers:
 *   post:
 *     summary: إنشاء منتقي ملفات
 *     tags: [FilePicker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, max_size_mb, allowed_extensions, typeDoc_id]
 *             properties:
 *               label:
 *                 type: string
 *                 example: وثائق الهوية الشخصية
 *               is_required:
 *                 type: boolean
 *                 example: true
 *               max_size_mb:
 *                 type: integer
 *                 example: 5
 *               allowed_extensions:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                 example: [pdf, png, jpg]
 *               allow_multiple:
 *                 type: boolean
 *                 example: true
 *               typeDoc_id:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *                 description: |
 *                   معرّف نوع الوثيقة — يقبل أيضاً type_doc_id أو TypeDoc_id.
 *                   يجب أن يكون موجوداً ونشطاً في type_docs.
 *     responses:
 *       201:
 *         description: تم الإنشاء بنجاح
 */
router.post(
  '/',
  authMiddleware,
  authorize('REQUIREMENTS_CREATE'),
  createFilePicker
)

/**
 * @swagger
 * /api/file-pickers/{id}:
 *   get:
 *     summary: جلب منتقي ملفات بالمعرّف
 *     tags: [FilePicker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: تم الجلب بنجاح
 *       404:
 *         description: غير موجود
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('REQUIREMENTS_READ_ONE'),
  getFilePickerById
)

module.exports = router
