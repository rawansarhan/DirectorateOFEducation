const express = require('express')
const router = express.Router()

const { authMiddleware, authorize } = require('../../../core/middleware/authMiddleware')

const {
  getSettings,
  listApplications,
  updateApplication,
  listVersions,
  createVersion,
  updateVersion,
  deleteVersion
} = require('../controllers/appUpdatesController')

/**
 * @swagger
 * /api/app-updates/settings:
 *   get:
 *     summary: فحص وجود تحديث لتطبيق (عامة — بلا مصادقة)
 *     description: |
 *       يستدعيها كل تطبيق عميل (citizen / employee / technical_team) عند كل إقلاع.
 *       الاستجابة `app_info: null` تعني "أنت محدَّث". لا throttle عمداً — تُستدعى عند كل إقلاع.
 *     tags: [App Updates]
 *     parameters:
 *       - in: query
 *         name: app
 *         required: true
 *         schema: { type: string, example: technical_team }
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [android, ios, windows], default: android }
 *       - in: query
 *         name: current_version_code
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: نتيجة فحص التحديث
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     force_update_enabled: { type: boolean }
 *                     soft_update_enabled: { type: boolean }
 *                     app_info:
 *                       nullable: true
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         application_name: { type: string }
 *                         display_name: { type: string }
 *                         package_name: { type: string, nullable: true }
 *                         version_name: { type: string }
 *                         version_code: { type: integer }
 *                         changelog: { type: string, nullable: true }
 *                         force_update: { type: boolean }
 *                         update_strategy: { type: string, enum: [direct, store] }
 *                         download_url: { type: string, nullable: true }
 *                         apk_size: { type: integer, nullable: true }
 *       404:
 *         description: التطبيق غير موجود
 */
router.get('/settings', getSettings)

/**
 * @swagger
 * /api/app-updates/admin/applications:
 *   get:
 *     summary: قائمة التطبيقات (citizen / employee / technical_team) — أدمن
 *     tags: [App Updates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list
 */
router.get(
  '/admin/applications',
  authMiddleware,
  authorize('APP_VERSION_MANAGE'),
  listApplications
)

/**
 * @swagger
 * /api/app-updates/admin/applications/{appId}:
 *   put:
 *     summary: تعديل استراتيجية التحديث وروابط المتجر لتطبيق — أدمن
 *     tags: [App Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apple_store_url: { type: string, nullable: true }
 *               google_play_url: { type: string, nullable: true }
 *               update_strategy: { type: string, enum: [store, direct] }
 *     responses:
 *       200:
 *         description: updated
 *       404:
 *         description: التطبيق غير موجود
 */
router.put(
  '/admin/applications/:appId',
  authMiddleware,
  authorize('APP_VERSION_MANAGE'),
  updateApplication
)

/**
 * @swagger
 * /api/app-updates/admin/applications/{appId}/versions:
 *   get:
 *     summary: قائمة إصدارات تطبيق (كل المنصات) — أدمن
 *     tags: [App Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: list
 *       404:
 *         description: التطبيق غير موجود
 *   post:
 *     summary: تسجيل إصدار جديد (رابط التنزيل يُدخَل يدوياً بعد رفع الملف خارجياً) — أدمن
 *     description: |
 *       الإصدار الجديد يُنشأ status=inactive افتراضياً — فعِّله يدوياً بعد التأكد أن apk_url
 *       يعمل فعلاً (رابط HTTPS بلا مصادقة). platform يجب أن يطابق نوع الملف تماماً:
 *       windows → رابط .exe (أو .msix لاحقاً)، android → رابط .apk.
 *     tags: [App Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform, version_name, version_code]
 *             properties:
 *               platform: { type: string, enum: [android, ios, windows] }
 *               version_name: { type: string, example: "1.0.2" }
 *               version_code: { type: integer, example: 3 }
 *               apk_url: { type: string, nullable: true }
 *               apk_size: { type: integer, nullable: true, description: "بالبايت" }
 *               changelog: { type: string, nullable: true }
 *               force_update_below_version_code: { type: integer, nullable: true }
 *               soft_update_below_version_code: { type: integer, nullable: true }
 *               status: { type: string, enum: [active, inactive], default: inactive }
 *     responses:
 *       201:
 *         description: created
 *       404:
 *         description: التطبيق غير موجود
 */
router.get(
  '/admin/applications/:appId/versions',
  authMiddleware,
  authorize('APP_VERSION_MANAGE'),
  listVersions
)

router.post(
  '/admin/applications/:appId/versions',
  authMiddleware,
  authorize('APP_VERSION_MANAGE'),
  createVersion
)

/**
 * @swagger
 * /api/app-updates/admin/applications/{appId}/versions/{versionId}:
 *   put:
 *     summary: تعديل إصدار موجود (platform/version_code غير قابلين للتعديل) — أدمن
 *     tags: [App Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apk_url: { type: string, nullable: true }
 *               apk_size: { type: integer, nullable: true }
 *               changelog: { type: string, nullable: true }
 *               force_update_below_version_code: { type: integer, nullable: true }
 *               soft_update_below_version_code: { type: integer, nullable: true }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: updated
 *       404:
 *         description: الإصدار غير موجود
 *   delete:
 *     summary: حذف إصدار — أدمن
 *     tags: [App Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: deleted
 *       404:
 *         description: الإصدار غير موجود
 */
router.put(
  '/admin/applications/:appId/versions/:versionId',
  authMiddleware,
  authorize('APP_VERSION_MANAGE'),
  updateVersion
)

router.delete(
  '/admin/applications/:appId/versions/:versionId',
  authMiddleware,
  authorize('APP_VERSION_MANAGE'),
  deleteVersion
)

module.exports = router
