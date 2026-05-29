'use strict'

const express = require('express')
const router = express.Router()

const {
  createField,
  updateField,
  getAllField,
  getOneActiveField
} = require('../controllers/FieldController')

const {
  authMiddleware,
  authorize
} = require('../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: Field
 *   description: Field Management APIs => (المسؤول التقني)
 */

/**
 * @swagger
 * /api/fields:
 *   get:
 *     summary: Get all active fields => (المسؤول التقني)
 *     tags: [Field]
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: تم جلب الحقول بنجاح
 */
router.get(
  '/',
  authMiddleware,
  authorize('FIELD_READ'),
  getAllField
)

/**
 * @swagger
 * /api/fields:
 *   post:
 *     summary: Create new field => (المسؤول التقني)
 *     tags: [Field]
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
 *               - field_name
 *               - field_type
 *
 *             properties:
 *
 *               field_name:
 *                 type: string
 *                 example: status
 *
 *               field_type:
 *                 type: string
 *                 enum:
 *                   - string
 *                   - int
 *                   - text
 *                   - date
 *                   - boolean
 *                   - float
 *                   - list
 *                 example: list
 *
 *               list_json:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - NEW
 *                   - PENDING
 *                   - DONE
 *
 *     responses:
 *       201:
 *         description: تم إنشاء الحقل بنجاح
 *
 *       400:
 *         description: خطأ في البيانات
 */
router.post(
  '/',
  authMiddleware,
  authorize('FIELD_CREATE'),
  createField
)

/**
 * @swagger
 * /api/fields/{id}:
 *   put:
 *     summary: Update field => (المسؤول التقني)
 *     tags: [Field]
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
 *             type: object
 *
 *             properties:
 *
 *               field_name:
 *                 type: string
 *                 example: updated_status
 *
 *               field_type:
 *                 type: string
 *                 enum:
 *                   - string
 *                   - int
 *                   - text
 *                   - date
 *                   - boolean
 *                   - float
 *                   - list
 *
 *               list_json:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - ACCEPTED
 *                   - REJECTED
 *
 *     responses:
 *       200:
 *         description: تم تعديل الحقل بنجاح
 *
 *       404:
 *         description: الحقل غير موجود
 */
router.put(
  '/:id',
  authMiddleware,
  authorize('FIELD_UPDATE'),
  updateField
)

/**
 * @swagger
 * /api/fields/{id}:
 *   get:
 *     summary: Get one active field
 *     tags: [Field]
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
 *         description: تم جلب الحقل بنجاح
 *
 *       404:
 *         description: الحقل غير موجود
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('GET_ONE_FIELD'),
  getOneActiveField
)

module.exports = router