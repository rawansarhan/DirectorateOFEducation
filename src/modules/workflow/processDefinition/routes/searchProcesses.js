'use strict'

const express = require('express')
const router = express.Router()

const {
  searchProcessDefinitionsController,
  searchProcessDefinitionsByOrganizationController
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
 *     summary: بحث تعاريف العمليات (أدمن)
 *     description: |
 *       **Auth:** `PROCESS_PUBLISH_MANAGE` (`type=admin`).
 *       فلاتر واسعة بما فيها `approval_status` و `include_inactive`.
 *       للموظف استخدم `/api/process_definitions/search/org`.
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 120 }
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
 *         description: أيضاً يُقبل alias `is_complete`
 *       - in: query
 *         name: include_inactive
 *         schema: { type: boolean }
 *       - in: query
 *         name: approval_status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *     responses:
 *       200:
 *         description: نتائج البحث (Cursor)
 *       403:
 *         description: Forbidden
 */
router.get(
  '/search',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  searchLimiter,
  searchProcessDefinitionsController
)

/**
 * @swagger
 * /api/process_definitions/search/org:
 *   get:
 *     summary: بحث تعاريف العمليات ضمن مؤسسة (موظف)
 *     description: |
 *       **Auth:** `GET_ORGANIZATIONAL_STRUCTURE` (`type=employee`).
 *       **`organization_id` إجباري** — النتائج محصورة بهذه المؤسسة فقط.
 *       افتراضي: `approval_status=APPROVED` و `is_active=true`.
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 120 }
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
 *         name: is_complaint
 *         schema: { type: boolean }
 *         description: أيضاً alias `is_complete`
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *     responses:
 *       200:
 *         description: نتائج البحث (Cursor)
 *       400:
 *         description: organization_id مفقود
 *       403:
 *         description: Forbidden
 */
router.get(
  '/search/org',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE'),
  searchLimiter,
  searchProcessDefinitionsByOrganizationController
)

module.exports = router
