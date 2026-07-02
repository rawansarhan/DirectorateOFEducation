'use strict'

const express = require('express')
const router = express.Router()

const {
  createDatePicker,
  getAllDatePickers,
  getDatePickerById
} = require('../controllers/datePickerController')

const {
  authMiddleware,
  authorize
} = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: DatePicker
 *   description: إدارة منتقيات التاريخ (Date Picker Widgets)
 */

/**
 * @swagger
 * /api/date-pickers:
 *   get:
 *     summary: جلب كل منتقيات التاريخ
 *     tags: [DatePicker]
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
  getAllDatePickers
)

/**
 * @swagger
 * /api/date-pickers:
 *   post:
 *     summary: إنشاء منتقي تاريخ
 *     tags: [DatePicker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, min_date, max_date]
 *             properties:
 *               label:
 *                 type: string
 *                 example: تاريخ الولادة
 *               is_required:
 *                 type: boolean
 *                 example: true
 *               min_date:
 *                 type: string
 *                 format: date
 *                 example: "1940-01-01"
 *               max_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-04"
 *     responses:
 *       201:
 *         description: تم الإنشاء بنجاح
 */
router.post(
  '/',
  authMiddleware,
  authorize('FIELD_CREATE'),
  createDatePicker
)

/**
 * @swagger
 * /api/date-pickers/{id}:
 *   get:
 *     summary: جلب منتقي تاريخ بالمعرّف
 *     tags: [DatePicker]
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
  getDatePickerById
)

module.exports = router
