'use strict'

const express = require('express')
const router = express.Router()

const {
  getIntegrityChainController,
  verifyIntegrityChainController
} = require('../controllers/integrityChainController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/transaction/{transactionId}/integrity-chain/verify:
 *   get:
 *     summary: Verify transaction integrity chain (public — for QR scan)
 *     description: |
 *       تحقق عام من سلسلة التواقيع — **لا يتطلب Bearer token**.
 *       يُستخدم عند مسح QR على الشهادة.
 *     tags: [Certificate & Integrity Chain]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 12
 *       - in: query
 *         name: head_hash
 *         schema:
 *           type: string
 *         description: اختياري — head hash من QR للمقارنة
 *       - in: query
 *         name: genesis_hash
 *         schema:
 *           type: string
 *         description: اختياري — genesis hash من QR للمقارنة
 *     responses:
 *       200:
 *         description: نتيجة التحقق (valid=true/false)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/IntegrityChainVerifyResult'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *   post:
 *     summary: Verify transaction integrity chain (public — POST body)
 *     description: |
 *       نفس GET verify — **بدون auth** — مع إرسال head_hash/genesis_hash في body.
 *     tags: [Certificate & Integrity Chain]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 12
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IntegrityChainVerifyRequest'
 *     responses:
 *       200:
 *         description: نتيجة التحقق
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/IntegrityChainVerifyResult'
 *       404:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/:transactionId/integrity-chain/verify',
  verifyIntegrityChainController
)

router.post(
  '/:transactionId/integrity-chain/verify',
  verifyIntegrityChainController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/integrity-chain:
 *   get:
 *     summary: Get transaction integrity chain (signature ledger + QR payload)
 *     description: |
 *       يعرض سلسلة التواقيع الرقمية الكاملة + qr_payload.
 *       **Auth:** Bearer — مالك المعاملة
 *     tags: [Certificate & Integrity Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 12
 *     responses:
 *       200:
 *         description: تم جلب سلسلة النزاهة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/IntegrityChainResponse'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: لا تملك صلاحية الوصول لهذه المعاملة
 *       404:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/:transactionId/integrity-chain',
  authMiddleware,
  getIntegrityChainController
)

module.exports = router
