const express = require('express')
const router = express.Router()

const {
  startWorkflowController,
  createSigningChallengeController,
  completeTaskController,
  getAllTasksController,
  getTaskDetailsController
} = require('../controllers/taskController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const {
  signingChallengeLimiter,
  completeTaskLimiter
} = require('../../../../core/security/rateLimitMiddleware')



/**
 * @swagger
 * /api/workflow/tasks:
 *   get:
 *     summary: Get all employee tasks
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tasks fetched successfully
 *       500:
 *         description: Internal server error
 */
router.get('/tasks', authMiddleware, getAllTasksController)

/**
 * @swagger
 * /api/workflow/tasks/{taskId}:
 *   get:
 *     summary: Get task details
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details fetched successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.get('/tasks/:taskId', authMiddleware, getTaskDetailsController)

/**
 * @swagger
 * /api/workflow/tasks/{taskId}/signing-challenge:
 *   post:
 *     summary: Create transaction signing challenge (USB private key)
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StageSubmissionPayload'
 *     responses:
 *       200:
 *         description: Signing challenge created
 *       400:
 *         description: Validation error
 *       423:
 *         description: Account locked
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/tasks/:taskId/signing-challenge',
  authMiddleware,
  signingChallengeLimiter,
  createSigningChallengeController
)

/**
 * @swagger
 * /api/workflow/tasks/{taskId}/complete:
 *   post:
 *     summary: Complete workflow task
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/StageSubmissionPayload'
 *               - type: object
 *                 required: [signature]
 *     responses:
 *       200:
 *         description: Task completed successfully
 *       400:
 *         description: Validation error
 *       423:
 *         description: Account locked after failed signature attempts
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
  '/tasks/:taskId/complete',
  authMiddleware,
  completeTaskLimiter,
  completeTaskController
)

module.exports = router
