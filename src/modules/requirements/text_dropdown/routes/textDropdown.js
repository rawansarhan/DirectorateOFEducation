'use strict'

const express = require('express')
const router = express.Router()

const {
  createTextDropdown,
  getAllTextDropdowns,
  getTextDropdownById
} = require('../controllers/textDropdownController')

const {
  authMiddleware,
  authorize
} = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: TextDropdown
 *   description: إدارة القوائم المنسدلة (Text Dropdown Widgets)
 */

/**
 * @swagger
 * /api/text-dropdowns:
 *   get:
 *     summary: جلب كل القوائم المنسدلة (مع ترقيم صفحات وبحث)
 *     tags: [TextDropdown]
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
  getAllTextDropdowns
)

/**
 * @swagger
 * /api/text-dropdowns:
 *   post:
 *     summary: إنشاء قائمة منسدلة
 *     tags: [TextDropdown]
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
 *                 example: محافظة الولادة
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
 *                       example: DAM
 *                     value:
 *                       type: string
 *                       example: دمشق
 *     responses:
 *       201:
 *         description: تم الإنشاء بنجاح
 */
router.post(
  '/',
  authMiddleware,
  authorize('FIELD_CREATE'),
  createTextDropdown
)

/**
 * @swagger
 * /api/text-dropdowns/{id}:
 *   get:
 *     summary: جلب قائمة منسدلة بالمعرّف
 *     tags: [TextDropdown]
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
  getTextDropdownById
)

module.exports = router
