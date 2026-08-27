const express = require('express')
const router = express.Router()

const {
  createTypeLocation,
  getAllTypeLocations
} = require('../controllers/TypeLocationController')
const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/type-location:
 *   post:
 *     summary: إضافة نوع موقع جديد (الفريق التقني فقط)
 *     description: |
 *       ينشئ نوع موقع جديداً (محافظة، منطقة، ناحية...) يُستخدم لاحقاً في
 *       `typeLocation_id` عند إنشاء موقع.
 *       الاسم فريد — إعادة إرسال اسم موجود تعيد 409.
 *       يتطلب صلاحية ORGANIZATIONAL_STRUCTURE_CREATE.
 *     tags: [TypeLocation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 150
 *                 example: منطقة
 *     responses:
 *       201:
 *         description: created
 *       400:
 *         description: validation error
 *       401:
 *         description: Unauthorized (token missing or invalid)
 *       403:
 *         description: Forbidden (missing ORGANIZATIONAL_STRUCTURE_CREATE permission)
 *       409:
 *         description: type location name already exists
 */
router.post(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  createTypeLocation
)

/**
 * @swagger
 * /api/type-location:
 *   get:
 *     summary: جلب كل أنواع المواقع (الفريق التقني فقط)
 *     description: |
 *       يعيد كل أنواع المواقع. يُستخدم لملء قائمة «نوع الموقع» عند إنشاء موقع،
 *       بدل استنتاج الأنواع من المواقع الموجودة (فنوع بلا مواقع كان لا يظهر).
 *       يتطلب صلاحية ORGANIZATIONAL_STRUCTURE_CREATE.
 *     tags: [TypeLocation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list of type locations
 *       401:
 *         description: Unauthorized (token missing or invalid)
 *       403:
 *         description: Forbidden (missing ORGANIZATIONAL_STRUCTURE_CREATE permission)
 */
router.get(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getAllTypeLocations
)

module.exports = router
