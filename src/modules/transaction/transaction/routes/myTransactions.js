'use strict'

const express = require('express')
const router = express.Router()

const {
  getMyTransactionsController,
  getMyTransactionCountsController
} = require('../controllers/transactionController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/transaction/my/counts:
 *   get:
 *     summary: Get authenticated user's transaction counts (AUTH)
 *     description: |
 *       يعيد **أعداد فقط** لمعاملات المواطن (بدون قائمة):
 *       - `completed` — المعاملات المكتملة
 *       - `in_progress` — المعاملات قيد المعالجة (`submitted`) + قيد التنفيذ (`in_progress`)
 *       - `total` — مجموع الاثنين
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم جلب أعداد معاملاتك بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTransactionCountsResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my/counts',
  authMiddleware,
  getMyTransactionCountsController
)

/**
 * @swagger
 * /api/transaction/my:
 *   get:
 *     summary: List authenticated user's transactions
 *     description: |
 *       يعرض كل معاملات المستخدم المسجّل مع اسم العملية، المرحلة الحالية، ونسبة الإنجاز،
 *       وحقل `is_complaint` لمعرفة إن كانت المعاملة شكوى أم لا.
 *
 *       **نجاح:** `{ success, status_code, message, data }`
 *       **خطأ:** `{ success, status_code, message, error, data: null }`
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, in_progress, completed, rejected]
 *         description: فلترة حسب حالة المعاملة (اختياري)
 *     responses:
 *       200:
 *         description: تم جلب معاملاتك بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTransactionsListResponse'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my',
  authMiddleware,
  getMyTransactionsController
)

module.exports = router
