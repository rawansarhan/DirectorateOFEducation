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
 *     description: |
 *       الخطوة 1 قبل complete عندما تتطلب المرحلة توقيع USB.
 *       1. GET /tasks/{taskId} — احصل على task lock
 *       2. أرسل pin + decision (مثل approve / reject)
 *       3. وقّع حقل `message` من الاستجابة بـ USB
 *       4. أرسل challenge_id + signature في POST /tasks/{taskId}/complete
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Camunda task ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SigningChallengePayload'
 *     responses:
 *       200:
 *         description: Signing challenge created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SigningChallengeResponse'
 *       400:
 *         description: Validation error or signature not required for this task
 *       409:
 *         description: Task lock required or held by another user
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
 *     description: |
 *       إكمال مهمة Camunda وحفظ بيانات المرحلة في المعاملة.
 *
 *       **تسلسل مقترح:**
 *       1. `GET /api/workflow/tasks/{taskId}` — task lock
 *       2. إذا التوقيع مطلوب: `POST /tasks/{taskId}/signing-challenge` ثم وقّع `message` من USB
 *       3. `POST /tasks/{taskId}/complete` — أرسل stage_name/fields/files/templates/variables/decision/signature/idempotency_key
 *
 *       **Response `data` (بدون actions):**
 *       `stage_name` → `fields` → `files` → `templates` (مع `path`) → `variables` → `signature` → `idempotency_key`
 *
 *       **Response format:**
 *       - success: `{ success, status_code, message, data }`
 *       - error: `{ success, status_code, message, error, data: null }`
 *
 *       **ملاحظات:**
 *       - `variables.decision` لتوجيه مسار Camunda (مثل over_50 — يطابق شرط BPMN)
 *       - `decision` قرار التوقيع (approve / reject) — يجب أن يطابق signing-challenge
 *       - `signature.challenge_id` + `signature.signature` من signing-challenge
 *       - `expected_version` اختياري لمنع تعارض التحديث
 *       - `idempotency_key` في الـ body (أو هيدر `Idempotency-Key`) — يُسجَّل **بعد** نجاح التوقيع
 *       - الاستجابة تتضمن `idempotent_replay: true/false` مثل submit
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Camunda task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteTaskPayload'
 *     responses:
 *       200:
 *         description: Task completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompleteTaskResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       409:
 *         description: Task lock conflict or duplicate in-flight request
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
