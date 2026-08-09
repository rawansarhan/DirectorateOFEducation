'use strict'

const express = require('express')
const router = express.Router()

const {
  searchProcessDefinitionsController
} = require('../controllers/processSearchController')
const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')
const { createRateLimiter } = require('../../../../core/security/rateLimitMiddleware')

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'تم تجاوز حد طلبات البحث — حاول بعد دقيقة'
})

/**
 * @swagger
 * /api/process_definitions/search:
 *   get:
 *     summary: بحث تعاريف العمليات / المعاملات
 *     description: |
 *       بحث بسيط وآمن بالاسم أو الرمز أو مفتاح Camunda.
 *       الافتراضي: `approval_status=APPROVED` و `is_active=true`.
 *
 *       **Auth:** Bearer + `GET_ORGANIZATIONAL_STRUCTURE`
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 120 }
 *         example: إجازة
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: code
 *         schema: { type: string }
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
 *         name: include_inactive
 *         schema: { type: boolean }
 *         description: عند true لا يُفرض is_active=true
 *       - in: query
 *         name: approval_status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/search',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE'),
  searchLimiter,
  searchProcessDefinitionsController
)

module.exports = router
