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
  authorize('PROCESS_PUBLISH_MANAGE'),
  getAllDatePickers
)

/**
 * @swagger
 * /api/date-pickers:
 *   post:
 *     summary: إنشاء منتقي تاريخ
 *     description: |
 *       **min_date / max_date** يقبلان:
 *       - `YYYY-MM-DD` ثابت (السلوك القديم)
 *       - `"today"` أو `{ "type": "today" }`
 *       - `{ "type": "relative", "years", "months", "days" }` (سالب = قبل اليوم)
 *
 *       عند استخدامها داخل `stage_config` تُحسب الحدود حسب تاريخ اليوم عند عرض الاستمارة.
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
 *                 description: YYYY-MM-DD أو today أو relative
 *                 oneOf:
 *                   - type: string
 *                     example: "1900-01-01"
 *                   - type: string
 *                     enum: [today]
 *                   - type: object
 *                     properties:
 *                       type: { type: string, enum: [today, relative] }
 *                       years: { type: integer, example: -5 }
 *                       months: { type: integer, example: -4 }
 *                       days: { type: integer, example: 0 }
 *               max_date:
 *                 description: YYYY-MM-DD أو today أو relative
 *                 oneOf:
 *                   - type: string
 *                     example: today
 *                   - type: object
 *                     properties:
 *                       type: { type: string, enum: [today, relative] }
 *                       years: { type: integer, example: 10 }
 *                       months: { type: integer, example: 7 }
 *                       days: { type: integer, example: 0 }
 *           examples:
 *             absolute:
 *               summary: مطلق YYYY-MM-DD (السلوك القديم)
 *               value:
 *                 label: فترة إدارية ثابتة
 *                 is_required: true
 *                 min_date: "2026-09-01"
 *                 max_date: "2026-09-30"
 *             birth_today:
 *               summary: تاريخ ولادة — max = today
 *               value:
 *                 label: تاريخ الولادة
 *                 is_required: true
 *                 min_date: "1900-01-01"
 *                 max_date: today
 *             age_18:
 *               summary: عمر ≥ 18
 *               value:
 *                 label: تاريخ ولادة (عمر ≥ 18)
 *                 is_required: true
 *                 min_date:
 *                   type: relative
 *                   years: -120
 *                 max_date:
 *                   type: relative
 *                   years: -18
 *             relative_months:
 *               summary: قبل 4 أشهر → بعد 7 أشهر
 *               value:
 *                 label: نافذة أشهر حول اليوم
 *                 is_required: true
 *                 min_date:
 *                   type: relative
 *                   years: 0
 *                   months: -4
 *                   days: 0
 *                 max_date:
 *                   type: relative
 *                   years: 0
 *                   months: 7
 *                   days: 0
 *             relative_years:
 *               summary: قبل 5 سنوات → بعد 10 سنوات
 *               value:
 *                 label: نافذة سنوات
 *                 is_required: false
 *                 min_date:
 *                   type: relative
 *                   years: -5
 *                 max_date:
 *                   type: relative
 *                   years: 10
 *             last_30_days:
 *               summary: خلال آخر 30 يوماً
 *               value:
 *                 label: خلال آخر 30 يوماً
 *                 is_required: false
 *                 min_date:
 *                   type: relative
 *                   days: -30
 *                 max_date:
 *                   type: today
 *             mixed_units:
 *               summary: مزيج سنوات + أشهر + أيام
 *               value:
 *                 label: مزيج وحدات
 *                 is_required: false
 *                 min_date:
 *                   type: relative
 *                   years: -1
 *                   months: -2
 *                   days: -3
 *                 max_date:
 *                   type: relative
 *                   months: 6
 *                   days: 10
 *             from_today:
 *               summary: من اليوم فصاعداً (سنة)
 *               value:
 *                 label: من اليوم فصاعداً
 *                 is_required: false
 *                 min_date:
 *                   type: today
 *                 max_date:
 *                   type: relative
 *                   years: 1
 *             absolute_and_today:
 *               summary: مطلق + اليوم
 *               value:
 *                 label: مطلق مع سقف اليوم
 *                 is_required: false
 *                 min_date: "2020-01-01"
 *                 max_date:
 *                   type: today
 *     responses:
 *       201:
 *         description: تم الإنشاء بنجاح
 *       400:
 *         description: بيانات غير صالحة
 */
router.post(
  '/',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
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
  authorize('PROCESS_PUBLISH_MANAGE'),
  getDatePickerById
)

module.exports = router
