'use strict'

const express = require('express')
const router = express.Router()

const {
  submitTransactionController,
  submitEncryptedTransactionController
} = require('../controllers/transactionController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const {
  submitTransactionLimiter,
  signingChallengeLimiter,
  completeTaskLimiter
} = require('../../../../core/security/rateLimitMiddleware')
const {
  createDocumentSubmitSigningChallengeByProcessController,
  createDocumentSubmitSigningChallengeByTransactionController,
  completeDocumentSubmitByTransactionController
} = require('../controllers/documentSubmitController')

/**
 * @swagger
 * /api/transaction/submit/process/{processId}:
 *   post:
 *     summary: Submit transaction by processId (citizen only) and start workflow
 *     description: |
 *       يقدّم المعاملة بمعرّف العملية في خطوة واحدة ويبدأ الـ workflow مباشرة.
 *
 *       **التدفق:**
 *       1. يبحث عن مسودة المستخدم على `processId`؛ إن وُجدت يُعيد استخدامها وإلا يُنشئ ترانزكشن جديد
 *       2. يتحقق من بيانات الهوية المرسلة في الطلب (first_name, last_name, father_name, mother_name, national_id) ويطبّقها على المسودة — على جذر الـ body أو ضمن كائن `identity`
 *       3. يقدّم الاستمارة ويُولَّد `id_process` (مثل STUTR-2026-001) ويُبدأ Camunda workflow
 *
 *       **قالب الطلب (إلزامي):** `form_id`, `form_name`, `widgets[]` (config_json + value), `templates[]` ({ id, value }), `note`
 *
 *       **للمواطن فقط — بدون `signature`.** أرسل بيانات الهوية مع الـ body.
 *       الموظف يُرفض على هذا المسار بـ 403؛ له مساره الخاص:
 *       `POST /api/transaction/process/{processId}/submit-documents/signing-challenge` ثم تقديم موقّع.
 *
 *       **مرفوض:** `fields`, `files`, `variables`, `employee`, `decision`, `stage_name`
 *       **القالب الفارغ:** GET `/api/stage_config/config/{processId}`
 *       - Idempotency تلقائي على مستوى المعاملة — لا ترسل Idempotency-Key
 *
 *       **Response `data`:** `id`, `id_process`, `status`, `idempotency_key`, ...
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: معرّف العملية (process id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitTransactionByProcessPayload'
 *     responses:
 *       200:
 *         description: تم تقديم المعاملة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitTransactionResponse'
 *       400:
 *         description: خطأ تحقق أو توقيع غير مسموح للمواطن أو معاملة قيد التنفيذ
 *       403:
 *         description: المسار للمواطن فقط — الموظف يُرفض هنا ويستخدم مسار التوقيع
 *       404:
 *         description: العملية غير موجودة
 *       500:
 *         description: فشل بدء workflow — راجع message للتفاصيل (غالباً بيانات القوالب/widgets)
 */
router.post(
  '/submit/process/:processId',
  authMiddleware,
  submitTransactionLimiter,
  submitTransactionController
)

/**
 * @swagger
 * /api/transaction/submit/process/{processId}/encrypted:
 *   post:
 *     summary: تقديم مشفّر (AES-256-GCM) بمعرّف العملية — مواطن فقط
 *     description: |
 *       نفس منطق `POST /api/transaction/submit/process/{processId}` بعد فك تشفير الجسم.
 *
 *       **Body مشفّر:**
 *       ```json
 *       { "iv": "<base64>", "ciphertext": "<base64>", "tag": "<base64>" }
 *       ```
 *
 *       بعد الفك يجب أن يكون النص JSON مطابقاً لـ `SubmitTransactionByProcessPayload`
 *       (form_id, widgets, templates, الهوية، …).
 *
 *       **الخوارزمية:** AES-256-GCM — المفتاح المشترك `SUBMIT_AES_KEY_BASE64` في `.env`.
 *       **للمواطن فقط** — بدون signature.
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: معرّف العملية (process id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [iv, ciphertext, tag]
 *             properties:
 *               iv:
 *                 type: string
 *                 description: IV عشوائي 12 بايت بصيغة base64
 *                 example: AbCdEfGhIjKlMnOp
 *               ciphertext:
 *                 type: string
 *                 description: النص المشفّر (JSON التقديم) بصيغة base64
 *               tag:
 *                 type: string
 *                 description: GCM auth tag بصيغة base64
 *     responses:
 *       200:
 *         description: تم تقديم المعاملة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitTransactionResponse'
 *       400:
 *         description: فشل فك التشفير أو تحقق التقديم
 *       403:
 *         description: المسار للمواطن فقط
 *       404:
 *         description: العملية غير موجودة
 *       503:
 *         description: مفتاح SUBMIT_AES_KEY_BASE64 غير مضبوط على السيرفر
 */
router.post(
  '/submit/process/:processId/encrypted',
  authMiddleware,
  submitTransactionLimiter,
  submitEncryptedTransactionController
)

/**
 * @swagger
 * /api/transaction/process/{processId}/submit-documents/signing-challenge:
 *   post:
 *     summary: تحدي توقيع لتقديم معاملة موظف (approve) — بمعرّف العملية
 *     description: |
 *       1. يبحث عن **مسودة draft** للموظف على `processId`
 *       2. إن وُجدت → ينشئ challenge عليها
 *       3. إن لم توجد → ينشئ draft جديد وينسخ هوية الموظف من حسابه:
 *          `first_name`, `last_name`, `father_name`, `mother_name`, `national_id`
 *       4. يتحقق من PIN ويرجع `transaction_id` للخطوة التالية (complete/submit)
 *
 *       **توقيع USB إلزامي** — لا يُسمح بالتقديم بدون توقيع.
 *
 *       **تسلسل:** signing-challenge → وقّع `message` → `POST .../submit-documents/complete` (بـ `transaction_id` من الرد)
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: معرّف تعريف العملية (process definition id)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentSubmitSigningChallengePayload'
 *     responses:
 *       200:
 *         description: تم إنشاء تحدي التوقيع — `data.transaction_id` للخطوة التالية
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SigningChallengeResponse'
 */
router.post(
  '/process/:processId/submit-documents/signing-challenge',
  authMiddleware,
  signingChallengeLimiter,
  createDocumentSubmitSigningChallengeByProcessController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/submit-documents/signing-challenge:
 *   post:
 *     summary: (legacy) تحدي توقيع — بمعرّف المعاملة
 *     deprecated: true
 *     description: يُفضّل `POST /api/transaction/process/{processId}/submit-documents/signing-challenge`
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentSubmitSigningChallengePayload'
 *     responses:
 *       200:
 *         description: تم إنشاء تحدي التوقيع
 */
router.post(
  '/:transactionId/submit-documents/signing-challenge',
  authMiddleware,
  signingChallengeLimiter,
  createDocumentSubmitSigningChallengeByTransactionController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/submit-documents/complete:
 *   post:
 *     summary: إكمال تقديم وثائق موقّعة — بمعرّف المعاملة
 *     description: |
 *       **مسودة draft:** يقدّم المعاملة ويبدأ workflow (نفس submit + signature).
 *
 *       **in_progress:** يكمل مهمة Camunda النشطة.
 *
 *       **توقيع USB إلزامي دائماً** — بدون `signature` يُرفض الطلب.
 *
 *       **تسلسل الموظف:** signing-challenge → وقّع `message` → POST هذا المسار
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DocumentSubmitCompletePayload'
 *     responses:
 *       200:
 *         description: تم تقديم الوثائق الموقّعة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompleteTaskResponse'
 */
router.post(
  '/:transactionId/submit-documents/complete',
  authMiddleware,
  completeTaskLimiter,
  completeDocumentSubmitByTransactionController
)

module.exports = router
