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
 *     summary: update existing draft 
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
 *             type: object
 *             example:
 *               full_name: أحمد محمد
 *               phone: 0999999999
 *               note: طلب جديد
 *     responses:
 *       200:
 *         description: Draft created or updated
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               final_note: تم التأكيد
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
  submitTransactionController
)


module.exports = router