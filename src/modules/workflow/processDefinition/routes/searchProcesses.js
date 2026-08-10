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
 *       بحث بسيط وآمن بالاسم أو الرمز أو مفتاح Camunda مع **Cursor Pagination**.
 *       الافتراضي: `approval_status=APPROVED` و `is_active=true`.
 *
 *       **الترقيم:** أرسل الطلب الأول بدون `cursor`، ثم مرّر `pagination.next_cursor`
 *       في `cursor` للصفحة التالية.
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
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب نتائج البحث بنجاح
 *               data:
 *                 items:
 *                   - id: 6
 *                     name: طلب إجازة
 *                     code: LEAVE_01
 *                     is_active: true
 *                     approval_status: APPROVED
 *                     type_trans_name: إجازات
 *                 pagination:
 *                   limit: 20
 *                   cursor: null
 *                   next_cursor: eyJrIjoicHJvYyIsIm4iOiLYqtmI2KjbjCDIp9mE2K_ZhdivIiwiaWQiOjZ9
 *                   has_next: true
 *                   has_prev: false
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
