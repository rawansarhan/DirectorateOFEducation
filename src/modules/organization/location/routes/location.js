const express = require('express')
const router = express.Router()

const { createLocation, getAllLocations } = require('../controllers/LocationController')
const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/location:
 *   post:
 *     summary: إضافة موقع جديد (الفريق التقني فقط)
 *     description: |
 *       ينشئ موقعًا جديدًا مربوطًا بنوع الموقع (typeLocation_id) واختياريًا بموقع أب (parent_id).
 *       يتطلب صلاحية LOCATION_CREATE الممنوحة لـ TECHNICAL_OFFICER فقط.
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocationCreate'
 *     responses:
 *       201:
 *         description: created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocationEnvelope'
 *       401:
 *         description: Unauthorized (token missing or invalid)
 *       403:
 *         description: Forbidden (missing LOCATION_CREATE permission)
 *       404:
 *         description: type location or parent location not found
 */
router.post(
  '/',
  authMiddleware,
  authorize('LOCATION_CREATE'),
  createLocation
)

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
