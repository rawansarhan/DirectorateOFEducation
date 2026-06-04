const express = require('express')
const router = express.Router()

const { getAllLocations } = require('../controllers/LocationController')
const { authMiddleware, authorize } = require('../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/location:
 *   get:
 *     summary: جلب كل المواقع (الفريق التقني فقط)
 *     description: |
 *       يعيد كل المواقع مع نوع الموقع (type_location) والموقع الأب (parent).
 *       يتطلب صلاحية LOCATION_VIEW الممنوحة لـ TECHNICAL_OFFICER فقط.
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list of locations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationListEnvelope'
 *       401:
 *         description: Unauthorized (token missing or invalid)
 *       403:
 *         description: Forbidden (missing LOCATION_VIEW permission)
 */
router.get(
  '/',
  authMiddleware,
  authorize('LOCATION_VIEW'),
  getAllLocations
)

module.exports = router
