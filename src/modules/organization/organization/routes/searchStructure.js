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

/**
 * @swagger
 * /api/organization/search:
 *   get:
 *     summary: بحث موحّد في الهيكل التنظيمي (مؤسسات / أقسام / أدوار)
 *     description: |
 *       API واحد للبحث في الهيكل:
 *       - `scope=all` (افتراضي): يعيد ثلاث قوائم قصيرة (typeahead)
 *       - `scope=organization|department|role`: قائمة مرقّمة
 *
 *       **Auth:** Bearer + `GET_ORGANIZATIONAL_STRUCTURE`
 *       النصوص مقيّدة الطول ومُهرَّبة من أحرف LIKE.
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, maxLength: 120 }
 *         example: موارد
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [all, organization, department, role]
 *           default: all
 *       - in: query
 *         name: organization_id
 *         schema: { type: integer }
 *         description: يضيّق الأقسام/الأدوار ضمن مؤسسة
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *         description: للـ scope المحدّد فقط (`organization|department|role`)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *     responses:
 *       200:
 *         description: نتائج البحث (Cursor Pagination للنطاق المحدّد)
 *       400:
 *         description: q مفقود أو cursor غير صالح
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
  searchStructureController
)

module.exports = router
