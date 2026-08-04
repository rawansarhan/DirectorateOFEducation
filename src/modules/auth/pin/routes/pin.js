'use strict'

const express = require('express')
const router = express.Router()

const {
  setupPinUser,
  verifyAppPinUser,
  changePinUser,
  deletePinUser
} = require('../controllers/PinController')

const { authMiddleware , authorize} = require('../../../../core/middleware/authMiddleware')
const accountLockMiddleware = require('../../../../core/security/accountLockMiddleware')
const { authSensitiveLimiter } = require('../../../../core/security/rateLimitMiddleware')

router.use(authSensitiveLimiter)

/**
 * @swagger
 * tags:
 *   name: App PIN
 *   description: قفل التطبيق — إنشاء، تحقق، تغيير، وحذف رمز PIN
 */

/**
 * @swagger
 * /api/auth/setup-pin:
 *   post:
 *     tags: [App PIN]
 *     summary: إنشاء رمز PIN (قفل التطبيق) — للمرة الأولى فقط
 *     description: |
 *       يُستخدم فقط عندما لا يوجد PIN مسبقاً للمستخدم.
 *       إذا كان PIN موجوداً يُرجع 409 — استخدم change-pin للتغيير أو delete-pin للحذف.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pin, confirm_pin]
 *             properties:
 *               pin:
 *                 type: string
 *                 example: "123456"
 *               confirm_pin:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: تم إنشاء PIN
 *       409:
 *         description: PIN موجود مسبقاً
 */
router.post('/setup-pin',
   authMiddleware, 
   authorize('PIN_SITTING'),
   accountLockMiddleware, 
   setupPinUser)

/**
 * @swagger
 * /api/auth/delete-pin:
 *   post:
 *     tags: [App PIN]
 *     summary: حذف رمز PIN (قفل التطبيق)
 *     description: |
 *       يتطلب JWT صالحاً وإدخال PIN الحالي.
 *       عند التحقق بنجاح يُحذف PIN ويُعطّل قفل التطبيق.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pin]
 *             properties:
 *               pin:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: تم حذف PIN
 *       400:
 *         description: PIN غير صحيح أو لا يوجد PIN
 */
  router.post('/delete-pin', 
  authMiddleware, 
  authorize('PIN_SITTING'),
  accountLockMiddleware,
  deletePinUser)

/**
 * @swagger
 * /api/auth/verify-app-pin:
 *   post:
 *     tags: [App PIN]
 *     summary: فتح قفل التطبيق عبر PIN (ليس تسجيل دخول)
 *     description: |
 *       يتطلب JWT صالحاً من login/OTP.
 *       لا يصدر token جديد — للتحقق فقط عند فتح التطبيق.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pin]
 *             properties:
 *               pin:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: تم فتح القفل
 */
router.post('/verify-app-pin', 
  authMiddleware, 
  authorize('PIN_SITTING'),
  accountLockMiddleware,
   verifyAppPinUser)

/**
 * @swagger
 * /api/auth/change-pin:
 *   post:
 *     tags: [App PIN]
 *     summary: تغيير PIN (يتطلب PIN القديم)
 *     description: |
 *       متاح لأي مستخدم مسجّل (مواطن أو موظف).
 *       يتحقق من PIN القديم ثم يحفظ PIN الجديد.
 *       للإعداد الأول استخدم setup-pin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [old_pin, new_pin, confirm_new_pin]
 *             properties:
 *               old_pin:
 *                 type: string
 *                 example: "123456"
 *               new_pin:
 *                 type: string
 *                 example: "654321"
 *               confirm_new_pin:
 *                 type: string
 *                 example: "654321"
 *     responses:
 *       200:
 *         description: تم تغيير PIN
 */
router.post('/change-pin',
   authMiddleware, 
   authorize('PIN_SITTING'),
   accountLockMiddleware,
    changePinUser)

/**
 * @swagger
 * /api/auth/citizen/change-pin:
 *   post:
 *     tags: [App PIN]
 *     summary: (deprecated) استخدم /api/auth/change-pin
 *     deprecated: true
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم تغيير PIN
 */
router.post('/citizen/change-pin',
   authMiddleware,
   authorize('PIN_SITTING'),
   accountLockMiddleware,
   changePinUser)

module.exports = router
