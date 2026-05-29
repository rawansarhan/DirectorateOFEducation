'use strict'

const express = require('express')
const router = express.Router()
const {
 createFile,
 updateFile,
 getAllFile,
 getOneActiveFile
} = require('../controllers/FilesController')
const { authMiddleware ,authorize } = require('../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: جلب كل الملفات => (المسؤول التقني)
 *     tags: [File]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة الملفات
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileListEnvelope'
 */

router.get('/', authMiddleware, authorize('FILE_READ'), getAllFile)

/**
 * @swagger
 * /api/files:
 *   post:
 *     summary: إنشاء ملف جديد => (المسؤول التقني)
 *     tags: [File]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileCreate'
 *     responses:
 *       200:
 *         description: تم الإنشاء بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileEnvelope'
 */
router.post('/', authMiddleware, authorize('FILE_CREATE'), createFile)

/**
 * @swagger
 * /api/files/{id}:
 *   put:
 *     summary: تعديل ملف => (المسؤول التقني)
 *     tags: [File]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: معرف الملف
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileUpdate'
 *     responses:
 *       200:
 *         description: تم التعديل
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileEnvelope'
 */
router.put('/:id', authMiddleware, authorize('FILE_UPDATE'), updateFile)

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get one active file => (المسؤول التقني)
 *     tags: [File]
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
 *         description: تم جلب الملف بنجاح
 *
 *       404:
 *         description: الملف غير موجود
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('GET_ONE_FILE'),
  getOneActiveFile
)
module.exports = router
