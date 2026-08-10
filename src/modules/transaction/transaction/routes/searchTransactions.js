'use strict'

const express = require('express')
const router = express.Router()

const {
  searchCompletedTransactionsController,
  searchRejectedTransactionsController
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
 *     summary: بحث المعاملات المنجزة التي مرّت بدائرة/شعب
 *     description: |
 *       نفس نطاق `GET /api/workflow/tasks/completed/by-department`
 *       مع فلاتر بحث نصية (اسم طالب / وطني / رقم معاملة / اسم عملية).
 *
 *       **يفرض** `transaction.status = completed` ودوائر مرّت بها المعاملة.
 *       شكل النتائج مطابق لقائمة المهام (Employee Task item).
 *
 *       **Auth:** Bearer + `GET_TASK_COMPLETED_BY_DEPARTMENT`
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department_ids
 *         required: true
 *         schema: { type: string, example: '1,2,3' }
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 120 }
 *         example: سارة محمد
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
 *       - in: query
 *         name: id_process
 *         schema: { type: string }
 *       - in: query
 *         name: process_name
 *         schema: { type: string }
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *     responses:
 *       200:
 *         description: نتائج البحث (Cursor) — نفس شكل completed/by-department
 *       403:
 *         description: لا صلاحية لإحدى الدوائر
 */
router.get(
  '/search',
  authMiddleware,
  authorize('GET_TASK_COMPLETED_BY_DEPARTMENT'),
  searchLimiter,
  searchCompletedTransactionsController
)

/**
 * @swagger
 * /api/transaction/search/rejected:
 *   get:
 *     summary: بحث المعاملات المرفوضة التي مرّت بدائرة/شعب
 *     description: |
 *       نفس نطاق `GET /api/workflow/tasks/rejected/by-department`
 *       مع فلاتر بحث نصية.
 *
 *       **Auth:** Bearer + `GET_TASK_REJECTED_BY_DEPARTMENT`
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department_ids
 *         required: true
 *         schema: { type: string, example: '1,2,3' }
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 120 }
 *       - in: query
 *         name: process_name
 *         schema: { type: string }
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *     responses:
 *       200:
 *         description: نتائج البحث (Cursor) — نفس شكل rejected/by-department
 *       403:
 *         description: لا صلاحية لإحدى الدوائر
 */
router.get(
  '/search/rejected',
  authMiddleware,
  authorize('GET_TASK_REJECTED_BY_DEPARTMENT'),
  searchLimiter,
  searchRejectedTransactionsController
)

module.exports = router
