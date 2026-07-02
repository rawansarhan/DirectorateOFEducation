'use strict'

const express = require('express')
const router = express.Router()

const {
  createCheckList,
  getAllCheckLists,
  getCheckListById
} = require('../controllers/checkListController')

const {
  authMiddleware,
  authorize
} = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: CheckList
 *   description: إدارة قوائم الاختيار المتعدد (Check List Widgets)
 */

/**
 * @swagger
 * /api/check-lists:
 *   get:
 *     summary: جلب كل قوائم الاختيار (مع ترقيم صفحات وبحث)
 *     tags: [CheckList]
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
  authorize('FIELD_READ'),
  getAllCheckLists
)

/**
 * @swagger
 * /api/check-lists:
 *   post:
 *     summary: إنشاء قائمة اختيار متعدد
 *     tags: [CheckList]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label, min_selected, max_selected, options]
 *             properties:
 *               label:
 *                 type: string
 *                 example: حلقات التعليم للتدريس
 *               is_required:
 *                 type: boolean
 *                 example: false
 *               min_selected:
 *                 type: integer
 *                 example: 1
 *               max_selected:
 *                 type: integer
 *                 example: 2
 *               options:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [key, value]
 *                   properties:
 *                     key:
 *                       type: string
 *                       example: cycle_1
 *                     value:
 *                       type: string
 *                       example: أساسي
 *     responses:
 *       201:
 *         description: تم الإنشاء بنجاح
 */
router.post(
  '/',
  authMiddleware,
  authorize('FIELD_CREATE'),
  createCheckList
)

/**
 * @swagger
 * /api/check-lists/{id}:
 *   get:
 *     summary: جلب قائمة اختيار بالمعرّف
 *     tags: [CheckList]
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
  getCheckListById
)

module.exports = router
