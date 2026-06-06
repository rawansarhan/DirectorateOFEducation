'use strict'

const express = require('express')
const router = express.Router()

const {
  createDraftController,
  updateDraftController,
  getUserDraftByProcessController,
  getTransactionController,
  submitTransactionController
} = require('../controllers/transactionController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/transaction/CreateDraft/{processId}:
 *   post:
 *     summary: Create new draft
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/CreateDraft/:processId',
  authMiddleware,
  createDraftController
)

/**
 * @swagger
 * /api/transaction/updateDraft/{transId}:
 *   post:
 *     summary: update existing draft
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/updateDraft/:transId',
  authMiddleware,
  updateDraftController
)

/**
 * @swagger
 * /api/transaction/draft/{processId}:
 *   get:
 *     summary: Get user draft by process
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/draft/:processId',
  authMiddleware,
  getUserDraftByProcessController
)

/**
 * @swagger
 * /api/transaction/{transactionId}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:transactionId',
  authMiddleware,
  getTransactionController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/submit:
 *   post:
 *     summary: Submit transaction and start workflow
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:transactionId/submit',
  authMiddleware,
  submitTransactionController
)

module.exports = router
