'use strict'

const express = require('express')
const router = express.Router()

const {
  loginUser,
  loginTechnicalOfficerUser,
  loginEmployeeUser,
  verifyLoginOtpUser,
  registerDeviceTokenUser,
  refreshTokenUser,
  logoutUser,
  resendOtpUser,
} = require('../controllers/SessionController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const accountLockMiddleware = require('../../../../core/security/accountLockMiddleware')
const {
  authSensitiveLimiter,
  authBruteForceLimiter
} = require('../../../../core/security/rateLimitMiddleware')

// لا نضع rate limit عام على كل الـ router:
// /refresh كان يستهلك نفس عدّاد الـ login لمدة 15 دقيقة ويقفل الدخول بالخطأ.

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل الدخول — مواطن (الخطوة 1 — يرسل OTP)
 *     description: |
 *       بوابة المواطن فقط — كل تعيينات OrgDepRole الفعّالة يجب أن يكون
 *       `role.code = CITIZEN` (يُرفض أي دور آخر).
 *       نفس منطق وريسبونس تسجيل الدخول (خطوة OTP).
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
 *       403:
 *         description: الحساب ليس مواطناً فقط (CITIZEN)
 */
router.post('/login', authBruteForceLimiter, loginUser)

/**
 * @swagger
 * /api/auth/login/technical-officer:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل الدخول — مسؤول تقني (الخطوة 1 — يرسل OTP)
 *     description: |
 *       بوابة المسؤول التقني فقط — كل تعيينات OrgDepRole الفعّالة يجب أن يكون
 *       `role.code = TECHNICAL_OFFICER` (يُرفض أي دور آخر).
 *       نفس منطق وريسبونس `POST /api/auth/login`.
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
 *       403:
 *         description: الحساب ليس مسؤولاً تقنياً فقط (TECHNICAL_OFFICER)
 */
router.post(
  '/login/technical-officer',
  authBruteForceLimiter,
  loginTechnicalOfficerUser
)

/**
 * @swagger
 * /api/auth/login/employee:
 *   post:
 *     tags: [Auth]
 *     summary: تسجيل الدخول — موظف (الخطوة 1 — يرسل OTP)
 *     description: |
 *       بوابة الموظفين — يمنع `CITIZEN` و `TECHNICAL_OFFICER`، ويسمح بأي دور آخر
 *       (مثل EMPLOYEE، DEPARTMENT_DIRECTOR، …).
 *       نفس منطق وريسبونس `POST /api/auth/login`.
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
 *       403:
 *         description: الحساب مواطن أو مسؤول تقني — غير مسموح من هذه البوابة
 */
router.post('/login/employee', authBruteForceLimiter, loginEmployeeUser)

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
router.post('/refresh', authSensitiveLimiter, refreshTokenUser)

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

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: إعادة إرسال OTP (عند انتهاء الصلاحية أو عدم الاستلام)
 *     description: |
 *       يقبل session_id الحالي ويُرسل OTP جديداً إلى نفس رقم الهاتف.
 *       يُرجع session_id جديداً يُستخدم في خطوة التحقق — **استبدل القديم بالجديد**.
 *       يعمل لكلا التدفقين: التسجيل (/verify-otp/register) وتسجيل الدخول (/verify-otp/login).
 *       محمي بـ rate limiter لمنع الإساءة.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOtpRequest'
 *     responses:
 *       200:
 *         description: تم إعادة إرسال OTP بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OtpSendResponse'
 *       400:
 *         description: الجلسة غير موجودة أو انتهت صلاحيتها — ابدأ من /register/citizen أو /login مجدداً
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         description: تجاوز عدد المحاولات المسموح بها
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post('/resend-otp', authBruteForceLimiter, resendOtpUser)

module.exports = router
