'use strict'

const express = require('express')
const router = express.Router()

const {
  searchStructureController
} = require('../controllers/structureSearchController')
const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')
const { createRateLimiter } = require('../../../../core/security/rateLimitMiddleware')

const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'تم تجاوز حد طلبات البحث — حاول بعد دقيقة'
})

const searchHandlers = [searchLimiter, searchStructureController]

/**
 * @swagger
 * /api/organization/search:
 *   get:
 *     summary: بحث ضمن مؤسسة (موظف) — أقسام / أدوار / موظفين
 *     description: |
 *       `organization_id` إجباري. **Auth:** `GET_ORGANIZATIONAL_STRUCTURE` (`type=employee`).
 *       للأدمن استخدم `/api/organization/admin/search`.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 1, maxLength: 120 }
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [all, department, role, employee], default: all }
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *     responses:
 *       200:
 *         description: نتائج البحث
 *       403:
 *         description: Forbidden
 */
router.get(
  '/search',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE'),
  ...searchHandlers
)

/**
 * @swagger
 * /api/organization/admin/search:
 *   get:
 *     summary: بحث ضمن مؤسسة (أدمن) — أقسام / أدوار / موظفين
 *     description: |
 *       نفس منطق `/search` مع **Auth:** `ORGANIZATIONAL_STRUCTURE_CREATE` (`type=admin`).
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 1, maxLength: 120 }
 *       - in: query
 *         name: scope
 *         schema: { type: string, enum: [all, department, role, employee], default: all }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *     responses:
 *       200:
 *         description: نتائج البحث
 *       403:
 *         description: Forbidden
 */
router.get(
  '/admin/search',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  ...searchHandlers
)

module.exports = router
