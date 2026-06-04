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
 *     summary: Get all employee tasks (paginated)
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: رقم الصفحة (يبدأ من 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 70
 *           default: 3
 *         description: عدد المهام في الصفحة
 *     responses:
 *       200:
 *         description: تم جلب المهام بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: تم جلب المهام بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 45
 *                         total_pages:
 *                           type: integer
 *                           example: 5
 *                         has_next:
 *                           type: boolean
 *                           example: true
 *                         has_prev:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: خطأ في الطلب
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 status_code:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: limit يجب أن يكون رقماً صحيحاً بين 1 و 100
 *                 error:
 *                   type: string
 *                   example: VALIDATION_ERROR
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
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
