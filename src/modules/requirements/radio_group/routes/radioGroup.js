'use strict'

const express = require('express')
const router = express.Router()

const {
  createRadioGroup,
  getAllRadioGroups,
  getRadioGroupById
} = require('../controllers/radioGroupController')

const {
  authMiddleware,
  authorize
} = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: RadioGroup
 *   description: إدارة مجموعات الاختيار (Radio Group Widgets)
 */

/**
 * @swagger
 * /api/radio-groups:
 *   get:
 *     summary: جلب كل مجموعات الاختيار (مع ترقيم صفحات وبحث)
 *     tags: [RadioGroup]
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
  getAllRadioGroups
)

/**
 * @swagger
 * /api/radio-groups:
 *   post:
 *     summary: إنشاء مجموعة اختيار
 *     tags: [RadioGroup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, options]
 *             properties:
 *               label:
 *                 type: string
 *                 example: الحالة الاجتماعية
 *               is_required:
 *                 type: boolean
 *                 example: true
 *               options:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [key, value]
 *                   properties:
 *                     key:
 *                       type: string
 *                       example: single
 *                     value:
 *                       type: string
 *                       example: عازب/ة
 *     responses:
 *       201:
 *         description: تم الإنشاء بنجاح
 */
router.post(
  '/',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  createRadioGroup
)

/**
 * @swagger
 * /api/radio-groups/{id}:
 *   get:
 *     summary: جلب مجموعة اختيار بالمعرّف
 *     tags: [RadioGroup]
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
  getRadioGroupById
)

module.exports = router
