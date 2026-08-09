'use strict'

const express = require('express')
const router = express.Router()

const {
  searchTransactionsController
} = require('../controllers/transactionSearchController')
const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')
const { createRateLimiter } = require('../../../../core/security/rateLimitMiddleware')

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'تم تجاوز حد طلبات البحث — حاول بعد دقيقة'
})

/**
 * @swagger
 * /api/transaction/search:
 *   get:
 *     summary: بحث وفلترة المعاملات (موظف مخوّل)
 *     description: |
 *       بحث احترافي للمعاملات مع فلاتر اختيارية (AND بين الشروط).
 *
 *       **الأمان:**
 *       - Bearer + صلاحية `VIEW_HISTORY_TRANSACTION`
 *       - لا تُعرض مسودات الغير (`draft` مستبعدة دائماً)
 *       - النصوص تُهذَّب وتُقيَّد بالطول وتُهرب من أحرف LIKE
 *
 *       **q / search / applicant_q** (نص واحد):
 *       - كلمة: اسم أول/أخير/أب/أم أو وطني أو رقم/رمز معاملة أو اسم العملية
 *       - كلمتان: أول+أخير أو أول+أب
 *       - ثلاث: أول+أب+أخير
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 120 }
 *         description: بحث نصي مرن (اسم / وطني / رقم معاملة / اسم عملية)
 *         example: سارة محمد أحمد
 *       - in: query
 *         name: first_name
 *         schema: { type: string }
 *       - in: query
 *         name: last_name
 *         schema: { type: string }
 *       - in: query
 *         name: father_name
 *         schema: { type: string }
 *       - in: query
 *         name: mother_name
 *         schema: { type: string }
 *       - in: query
 *         name: national_id
 *         schema: { type: string }
 *         example: "04259204010"
 *       - in: query
 *         name: id_process
 *         schema: { type: string }
 *         example: TXN-2026-000123
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [submitted, in_progress, completed, rejected]
 *       - in: query
 *         name: statuses
 *         schema: { type: string }
 *         description: قائمة مفصولة بفواصل مثل completed,rejected
 *       - in: query
 *         name: process_name
 *         schema: { type: string }
 *         example: إجازة
 *       - in: query
 *         name: process_definition_id
 *         schema: { type: integer }
 *       - in: query
 *         name: type_trans_id
 *         schema: { type: integer }
 *       - in: query
 *         name: organization_id
 *         schema: { type: integer }
 *       - in: query
 *         name: is_complaint
 *         schema: { type: boolean }
 *       - in: query
 *         name: type_doc_id
 *         schema: { type: integer }
 *         description: معاملات فيها مرفوع من هذا النوع
 *       - in: query
 *         name: type_doc_ids
 *         schema: { type: string }
 *         description: عدة أنواع مفصولة بفواصل
 *       - in: query
 *         name: has_final_document
 *         schema: { type: boolean }
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *         example: "2026-01-01"
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *         example: "2026-08-01"
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *         description: cursor من الصفحة السابقة (`pagination.next_cursor`)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *     responses:
 *       200:
 *         description: نتائج البحث (Cursor Pagination)
 *         content:
 *           application/json:
 *             examples:
 *               sample:
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب نتائج البحث بنجاح
 *                   data:
 *                     items:
 *                       - transaction_id: 12
 *                         id_process: TXN-2026-000123
 *                         code: LEAVE_01
 *                         status: completed
 *                         first_name: سارة
 *                         last_name: أحمد
 *                         father_name: محمد
 *                         mother_name: هدى
 *                         national_id: "04259204010"
 *                         process_definition_name: طلب إجازة
 *                         has_final_document: true
 *                     pagination:
 *                       limit: 20
 *                       cursor: null
 *                       next_cursor: eyJrIjoidHhuIiwidCI6IjIwMjYtMDgtMDFUMTI6MDA6MDAuMDAwWiIsImlkIjoxMn0
 *                       has_next: true
 *                       has_prev: false
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — يحتاج VIEW_HISTORY_TRANSACTION
 */
router.get(
  '/search',
  authMiddleware,
  authorize('VIEW_HISTORY_TRANSACTION'),
  searchLimiter,
  searchTransactionsController
)

module.exports = router
