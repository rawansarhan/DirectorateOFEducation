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
 *     summary: جلب كل منتقيات التاريخ (مع ترقيم صفحات وبحث)
 *     tags: [DatePicker]
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
 *         description: نص البحث في العنوان (label) أو معرّف الودجت (id_widget)
 *     responses:
 *       200:
 *         description: تم الجلب بنجاح
 */
router.get(
  '/',
  authMiddleware,
  authorize('REQUIREMENTS_READ_ALL'),
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
  authorize('REQUIREMENTS_CREATE'),
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
  authorize('REQUIREMENTS_READ_ONE'),
  getDatePickerById
)

module.exports = router
