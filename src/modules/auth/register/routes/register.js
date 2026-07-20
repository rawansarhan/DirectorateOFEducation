'use strict'

const express = require('express')
const router = express.Router()

const {
  registerEmployeeUser,
  registerCitizenUser,
  verifyRegisterOtpUser,
} = require('../controllers/RegisterController')

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')
const accountLockMiddleware = require('../../../../core/security/accountLockMiddleware')
const {
  authSensitiveLimiter,
  authBruteForceLimiter
} = require('../../../../core/security/rateLimitMiddleware')

router.use(authSensitiveLimiter)

/**
 * @swagger
 * /api/auth/register/employee:
 *   post:
 *     tags: [Auth]
 *     summary: إنشاء حساب موظف (الفريق التقني فقط)
 *     description: |
 *       ينشئ حساب موظف مع كلمة مرور و PIN (6 أرقام).
 *       public_key مطلوب (يُولَّد في المتصفح). private_key اختياري — إن أُرسل يُتحقق من مطابقته وتشفيره بـ PIN داخلياً فقط.
 *       السيرفر يخزّن public_key فقط ولا يُرجع المفتاح الخاص.
 *       شكل الاستجابة: { success, status_code, message, data }.
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

module.exports = router
