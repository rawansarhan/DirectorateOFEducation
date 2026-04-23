'use strict'

const express = require('express')
const router = express.Router()
const {
 createFile,
 updateFile,
 getAllFile
} = require('../controllers/Files')

/**
 * @swagger
 * /files:
 *   get:
 *     summary: جلب كل الملفات
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

router.get('/', getAllFile)

/**
 * @swagger
 * /files:
 *   post:
 *     summary: إنشاء ملف جديد
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
router.post('/', createFile)

/**
 * @swagger
 * /files/{id}:
 *   put:
 *     summary: تعديل ملف
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
router.put('/:id', updateFile)

module.exports = router
