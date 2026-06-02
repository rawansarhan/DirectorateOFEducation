const express = require('express')

const router = express.Router()

const {
   createDraftController,

  UpdateDraftController,

  getUserDraftByProcessController,

  getTransactionController,

  submitTransactionController,


} = require('../controllers/transactionController')

const {
  authMiddleware
} = require('../../../core/middleware/authMiddleware')

const {
  submitTransactionLimiter
} = require('../../../core/security/rateLimitMiddleware')

const {
  getIntegrityChainController,
  verifyIntegrityChainController
} = require('../controllers/integrityChainController')

const {
  getTransactionFullController
} = require('../controllers/transactionFullController')
/**
 * =====================================================
 * CREATE  DRAFT
 * =====================================================
 */

/**
 * @swagger
 * /api/transaction/CreateDraft/{processId}:
 *   post:
 *     summary: Create new draft 
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Draft created or updated
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/CreateDraft/:processId',
  authMiddleware,
  createDraftController
)
/**
 * =====================================================
 * CREATE OR UPDATE DRAFT
 * =====================================================
 */

/**
 * @swagger
 * /api/transaction/updateDraft/{transId}:
 *   post:
 *     summary: Update transaction draft (fixed submission envelope)
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StageSubmissionPayload'
 *     responses:
 *       200:
 *         description: Draft saved
 *       409:
 *         description: Version conflict (expected_version)
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/updateDraft/:transId',
  authMiddleware,
  UpdateDraftController
)

/**
 * =====================================================
 * GET USER DRAFT BY PROCESS
 * =====================================================
 */

/**
 * @swagger
 * /api/transaction/draft/{processId}:
 *   get:
 *     summary: Get user draft by process
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Draft retrieved successfully
 *       404:
 *         description: Draft not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/draft/:processId',
  authMiddleware,
  getUserDraftByProcessController
)

/**
 * =====================================================
 * GET TRANSACTION BY ID
 * =====================================================
 */

/**
 * @swagger
 * /api/transaction/{transactionId}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 10
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:transactionId',
  authMiddleware,
  getTransactionController
)

/**
 * =====================================================
 * SUBMIT TRANSACTION
 * =====================================================
 */

/**
 * @swagger
 * /api/transaction/{transactionId}/submit:
 *   post:
 *     summary: Submit transaction and start workflow
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 15
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StageSubmissionPayload'
 *     responses:
 *       200:
 *         description: Transaction submitted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:transactionId/submit',
  authMiddleware,
  submitTransactionLimiter,
  submitTransactionController
)

/**
 * @swagger
 * /api/transaction/{id}/integrity-chain:
 *   get:
 *     summary: Get transaction integrity chain (signature ledger)
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Integrity chain fetched
 */
router.get(
  '/:id/integrity-chain',
  authMiddleware,
  getIntegrityChainController
)

/**
 * @swagger
 * /api/transaction/{id}/full:
 *   get:
 *     summary: Get full transaction view with stages, data, and QR payload (PDF on frontend)
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Full transaction fetched
 */
router.get(
  '/:id/full',
  authMiddleware,
  getTransactionFullController
)

/**
 * @swagger
 * /api/transaction/{id}/integrity-chain/verify:
 *   get:
 *     summary: Verify transaction integrity chain (public — for QR scan)
 *     tags: [Transaction]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: head
 *         schema:
 *           type: string
 *         description: Optional head_hash from QR payload
 *     responses:
 *       200:
 *         description: Chain is valid
 *       422:
 *         description: Forged or tampered transaction
 */
router.get(
  '/:id/integrity-chain/verify',
  verifyIntegrityChainController
)

router.post(
  '/:id/integrity-chain/verify',
  verifyIntegrityChainController
)


module.exports = router