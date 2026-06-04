'use strict'

const express = require('express')
const router = express.Router()

const {
  registerEmployeeUser,
  registerCitizenUser,
  verifyRegisterOtpUser,
  loginUser,
  verifyLoginOtpUser,
  registerDeviceTokenUser,
  setupPinUser,
  verifyAppPinUser,
  changePinUser,
  employeeVerifyPinUser,
  employeeChallengeUser,
  employeeVerifySignatureUser,
  refreshTokenUser,
  logoutUser,
} = require('../controllers/AuthController')

const { authMiddleware, authorize } = require('../../../core/middleware/authMiddleware')
const accountLockMiddleware = require('../../../core/security/accountLockMiddleware')
const {
  authSensitiveLimiter,
  authBruteForceLimiter
} = require('../../../core/security/rateLimitMiddleware')

router.use(authSensitiveLimiter)

/**
 * @swagger
 * /api/auth/register/employee:
 *   post:
 *     tags: [Auth]
 *     summary: إنشاء حساب موظف (الفريق التقني فقط)
 *     description: |
 *       ينشئ حساب موظف مع PIN ومفتاح Ed25519.
 *       public_key يُولَّد في المتصفح ويُرسل للسيرفر فقط.
 *       private_key لا يمر عبر السيرفر.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterEmployeeRequest'
 *     responses:
 *       200:
 *         description: تم إنشاء حساب الموظف
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterEmployeeResponse'
 */
router.post(
  '/register/employee',
  authMiddleware,
  accountLockMiddleware,
  authorize('admin_register_employee'),
  registerEmployeeUser
)

/**
 * @swagger
 * /api/auth/register/citizen:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل مواطن (الخطوة 1 — يرسل OTP)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterCitizenRequest'
 *     responses:
 *       200:
 *         description: تم إرسال OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpSendResponse'
 */
router.post('/register/citizen', registerCitizenUser)

/**
 * @swagger
 * /api/auth/verify-otp/register:
 *   post:
 *     tags: [Auth]
 *     summary: التحقق من OTP لإتمام التسجيل (الخطوة 2)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *     responses:
 *       201:
 *         description: تم تفعيل الحساب وإرجاع الـ token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyRegisterOtpResponse'
 */
router.post('/verify-otp/register', authBruteForceLimiter, verifyRegisterOtpUser)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل الدخول (الخطوة 1 — يرسل OTP)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: تم إرسال OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpSendResponse'
 */
router.post('/login', authBruteForceLimiter, loginUser)

/**
 * @swagger
 * /api/auth/verify-otp/login:
 *   post:
 *     tags: [Auth]
 *     summary: التحقق من OTP لإتمام تسجيل الدخول (الخطوة 2)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *     responses:
 *       200:
 *         description: تم تسجيل الدخول وإرجاع الـ token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyLoginOtpResponse'
 */
router.post('/verify-otp/login', authBruteForceLimiter, verifyLoginOtpUser)

/**
 * @swagger
 * /api/auth/device-token:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل FCM token للإشعارات
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcm_token]
 *             properties:
 *               fcm_token:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [android, ios, web]
 *               device_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: تم حفظ التوكن
 */
router.post('/device-token', authMiddleware, accountLockMiddleware, registerDeviceTokenUser)

/**
 * @swagger
 * /api/auth/setup-pin:
 *   post:
 *     tags: [Auth]
 *     summary: إنشاء أو تغيير رمز PIN (قفل التطبيق)
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
 */
router.post('/setup-pin', authMiddleware, accountLockMiddleware, setupPinUser)

/**
 * @swagger
 * /api/auth/verify-app-pin:
 *   post:
 *     tags: [Auth]
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
router.post('/verify-app-pin', authMiddleware, accountLockMiddleware, verifyAppPinUser)

/**
 * @swagger
 * /api/auth/change-pin:
 *   post:
 *     tags: [Auth]
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
router.post('/change-pin', authMiddleware, accountLockMiddleware, changePinUser)

/**
 * @swagger
 * /api/auth/citizen/change-pin:
 *   post:
 *     tags: [Auth]
 *     summary: (deprecated) استخدم /api/auth/change-pin
 *     deprecated: true
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم تغيير PIN
 */
router.post('/citizen/change-pin', authMiddleware, accountLockMiddleware, changePinUser)

/**
 * @swagger
 * /api/auth/employee/verify-pin:
 *   post:
 *     tags: [Auth]
 *     summary: تحقق PIN للموظف (الخطوة 1)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userName, pin]
 *             properties:
 *               userName:
 *                 type: string
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: pin_session_id للخطوة التالية
 */
router.post('/employee/verify-pin', authBruteForceLimiter, employeeVerifyPinUser)

/**
 * @swagger
 * /api/auth/employee/challenge:
 *   post:
 *     tags: [Auth]
 *     summary: طلب challenge للموظف (الخطوة 2)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pin_session_id]
 *             properties:
 *               pin_session_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: challenge للتوقيع بـ private key
 */
router.post('/employee/challenge', employeeChallengeUser)

/**
 * @swagger
 * /api/auth/employee/verify-signature:
 *   post:
 *     tags: [Auth]
 *     summary: التحقق من التوقيع الرقمي وإصدار JWT (الخطوة 3)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [challenge_id, signature]
 *             properties:
 *               challenge_id:
 *                 type: string
 *                 format: uuid
 *               signature:
 *                 type: string
 *                 description: base64 signature signed with private key from USB
 *     responses:
 *       200:
 *         description: JWT token
 */
router.post('/employee/verify-signature', authBruteForceLimiter, employeeVerifySignatureUser)

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: تجديد الـ access token باستخدام refresh token
 *     description: |
 *       يتحقق من الـ refresh token ويُصدر زوجاً جديداً (access + refresh).
 *       يتم تدوير الـ refresh token: القديم يُبطَل ويُصدَر جديد.
 *       عند كشف إعادة استخدام توكن مُبطَل تُلغى كل جلسات المستخدم.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: تم إصدار زوج توكنات جديد
 *       401:
 *         description: refresh token غير صالح أو منتهٍ أو مُبطَل
 */
router.post('/refresh', authBruteForceLimiter, refreshTokenUser)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل الخروج (إبطال refresh token)
 *     description: يُبطل الـ refresh token المرسل بحيث لا يمكن استخدامه للتجديد بعد الآن.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: تم تسجيل الخروج
 */
router.post('/logout', logoutUser)

module.exports = router
