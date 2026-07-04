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
 *     summary: جلب كل قوائم الاختيار
 *     tags: [CheckList]
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
  authorize('REQUIREMENTS_CREATE'),
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
  authorize('REQUIREMENTS_READ_ONE'),
  getCheckListById
)

module.exports = router
