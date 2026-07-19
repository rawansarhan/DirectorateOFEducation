'use strict'

const express = require('express')
const router = express.Router()

const {
  employeeVerifyPinUser,
  employeeChallengeUser,
  employeeVerifySignatureUser,
} = require('../controllers/ChallengeController')

const {
  authSensitiveLimiter,
  authBruteForceLimiter
} = require('../../../../core/security/rateLimitMiddleware')

router.use(authSensitiveLimiter)

/**
 * @swagger
 * /api/auth/employee/verify-pin:
 *   post:
 *     tags: [Auth]
 *     summary: تحقق كلمة مرور الموظف (الخطوة 1)
 *     description: |
 *       يتحقق من userName + password (وليس PIN).
 *       يُرجع pin_session_id للخطوة التالية (challenge + توقيع).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeVerifyPasswordRequest'
 *     responses:
 *       200:
 *         description: pin_session_id للخطوة التالية
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeVerifyPasswordResponse'
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
 *             $ref: '#/components/schemas/EmployeeChallengeRequest'
 *     responses:
 *       200:
 *         description: challenge للتوقيع بـ private key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeChallengeResponse'
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
 *             $ref: '#/components/schemas/EmployeeVerifySignatureRequest'
 *     responses:
 *       200:
 *         description: JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyRegisterOtpResponse'
 */
router.post('/employee/verify-signature', authBruteForceLimiter, employeeVerifySignatureUser)

module.exports = router
