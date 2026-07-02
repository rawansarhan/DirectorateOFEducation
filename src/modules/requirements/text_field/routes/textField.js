'use strict'

const express = require('express')
const router = express.Router()

const {
  createTextField,
  getAllTextFields,
  getTextFieldById
} = require('../controllers/textFieldController')

const {
  authMiddleware,
  authorize
} = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: TextField
 *   description: إدارة حقول النص (Text Field Widgets)
 */

/**
 * @swagger
 * /api/text-fields:
 *   get:
 *     summary: جلب كل حقول النص
 *     tags: [TextField]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم الجلب بنجاح
 */
router.get(
  '/',
  authMiddleware,
  authorize('FIELD_READ'),
  getAllTextFields
)

/**
 * @swagger
 * /api/text-fields:
 *   post:
 *     summary: إنشاء حقل نص
 *     tags: [TextField]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, input_type]
 *             properties:
 *               label:
 *                 type: string
 *                 example: الاسم الكامل
 *               is_required:
 *                 type: boolean
 *                 example: true
 *               input_type:
 *                 type: string
 *                 enum: [text, string, int, phoneNumber, email]
 *                 example: string
 *               regex:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *               max_length:
 *                 type: integer
 *                 nullable: true
 *                 example: 100
 *               min_length:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *     responses:
 *       201:
 *         description: تم الإنشاء بنجاح
 */
router.post(
  '/',
  authMiddleware,
  authorize('FIELD_CREATE'),
  createTextField
)

/**
 * @swagger
 * /api/text-fields/{id}:
 *   get:
 *     summary: جلب حقل نص بالمعرّف
 *     tags: [TextField]
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
  authorize('GET_ONE_FIELD'),
  getTextFieldById
)

module.exports = router
