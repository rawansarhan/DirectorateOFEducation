'use strict'

const express = require('express')
const router = express.Router()

const {
  createDraftController,
  updateDraftController,
  upsertDraftController,
  getUserDraftByProcessController,
  getMyTransactionsController,
  getMyTransactionCountsController,
  getTransactionController,
  submitTransactionController
} = require('../controllers/transactionController')

const {
  getIntegrityChainController,
  verifyIntegrityChainController
} = require('../../integrityChain/controllers/integrityChainController')

const {
  getCertificateController,
  uploadFinalDocumentController,
  getFinalDocumentController
} = require('../../certificate/controllers/transactionCertificateController')

const {
  uploadFinalTransactionPdf,
  runMulterUpload
} = require('../../../../core/middleware/upload')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const { submitTransactionLimiter, signingChallengeLimiter, completeTaskLimiter } = require('../../../../core/security/rateLimitMiddleware')
const {
  createDocumentSubmitSigningChallengeByProcessController,
  createDocumentSubmitSigningChallengeByTransactionController,
  completeDocumentSubmitByTransactionController
} = require('../../../workflow/taskCamunda/controllers/taskController')

/**
 * @swagger
 * /api/transaction/CreateDraft/{processId}:
 *   post:
 *     summary: Create new draft
 *     description: ينشئ مسودة معاملة جديدة للمستخدم على عملية محددة. إذا وُجدت مسودة سابقة لنفس العملية يُعاد نفس السجل.
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
 *     responses:
 *       200:
 *         description: تمت العملية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       oneOf:
 *                         - $ref: '#/components/schemas/TransactionOutput'
 *                         - $ref: '#/components/schemas/TransactionDraftCreateResult'
 *       400:
 *         description: خطأ في الطلب
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/CreateDraft/:processId',
  authMiddleware,
  createDraftController
)

/**
 * @swagger
 * /api/transaction/upsertDraft/{processId}:
 *   post:
 *     summary: Create or update draft (upsert)
 *     description: |
 *       يدمج إنشاء وتحديث مسودة الاستمارة:
 *       - إن وُجدت مسودة يُعاد سجلها (ويُحدَّث إن وُجد `data`).
 *       - إن لم توجد مسودة يُنشأ سجل جديد.
 *       يقبل `{ "data": { form_id, form_name, widgets[] } }` فقط.
 *       كل ودجت يجب أن يحتوي `widget_type`, `data`, `value`.
 *       تُتحقق الاستمارة مقابل إعدادات مرحلة AUTH للعملية.
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
 *         description: معرّف تعريف العملية
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionDraftUpsertInput'
 *     responses:
 *       200:
 *         description: تمت العملية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionDraftUpsertResult'
 *       400:
 *         description: خطأ في الطلب
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: العملية غير موجودة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post(
  '/upsertDraft/:processId',
  authMiddleware,
  upsertDraftController
)

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
 *       502:
 *         description: فشل بدء workflow
 */
router.post(
  '/submit/process/:processId',
  authMiddleware,
  submitTransactionLimiter,
  submitTransactionController
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

/**
 * @swagger
 * /api/transaction/updateDraft/{processId}:
 *   post:
 *     summary: Create or update draft identity fields
 *     description: |
 *       **الخطوة الأولى** قبل تقديم المعاملة:
 *       1. يُمرَّر `processId` (معرّف تعريف العملية)
 *       2. إن وُجدت مسودة draft للمستخدم على هذه العملية → تُحدَّث بيانات الهوية
 *       3. إن لم توجد مسودة → يُنشأ سجل draft جديد ثم تُحفظ بيانات الهوية
 *
 *       يحدّث حقول هوية المواطن:
 *       `first_name`, `last_name`, `father_name`, `mother_name`, `national_id`.
 *       يجب إرسال حقل واحد على الأقل.
 *
 *       **Response `data.draft.id`:** استخدمه في `POST /api/transaction/submit/{transactionId}`
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
 *             $ref: '#/components/schemas/TransactionIdentityInput'
 *     responses:
 *       200:
 *         description: تم حفظ المسودة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionDraftUpdateResult'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/updateDraft/:processId',
  authMiddleware,
  updateDraftController
)

/**
 * @swagger
 * /api/transaction/draft/{processId}:
 *   get:
 *     summary: Get user draft by process
 *     description: يجلب مسودة المستخدم الحالي لعملية محددة (حسب process code).
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
 *     responses:
 *       200:
 *         description: تم جلب المسودة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionOutput'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/draft/:processId',
  authMiddleware,
  getUserDraftByProcessController
)

/**
 * @swagger
 * /api/transaction/my/counts:
 *   get:
 *     summary: Get authenticated user's transaction counts (AUTH)
 *     description: |
 *       يعيد **أعداد فقط** لمعاملات المواطن (بدون قائمة):
 *       - `completed` — المعاملات المكتملة
 *       - `in_progress` — المعاملات قيد المعالجة (`submitted`) + قيد التنفيذ (`in_progress`)
 *       - `total` — مجموع الاثنين
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم جلب أعداد معاملاتك بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTransactionCountsResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my/counts',
  authMiddleware,
  getMyTransactionCountsController
)

/**
 * @swagger
 * /api/transaction/my:
 *   get:
 *     summary: List authenticated user's transactions
 *     description: |
 *       يعرض كل معاملات المستخدم المسجّل مع اسم العملية، المرحلة الحالية، ونسبة الإنجاز.
 *
 *       **نجاح:** `{ success, status_code, message, data }`
 *       **خطأ:** `{ success, status_code, message, error, data: null }`
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, in_progress, completed, rejected, cancelled]
 *         description: فلترة حسب حالة المعاملة (اختياري)
 *     responses:
 *       200:
 *         description: تم جلب معاملاتك بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserTransactionsListResponse'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my',
  authMiddleware,
  getMyTransactionsController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/certificate:
 *   get:
 *     summary: بيانات الشهادة للطباعة (transaction_history + QR)
 *     description: |
 *       يجمع كل ما يحتاجه الفرونت لبناء PDF:
 *       transaction_history (id_process + applicant + stages + templates.generated_pdf_path), integrity_chain.qr_payload, final_document
 *       **للمواطن (مالك المعاملة) فقط** — للموظف استخدم GET /api/workflow/transactions/{transactionId}/certificate
 *       **متاح فقط للمعاملات completed**
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: بيانات الشهادة
 */
router.get(
  '/:transactionId/certificate',
  authMiddleware,
  getCertificateController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document:
 *   post:
 *     summary: رفع وحفظ PDF النهائي بعد توليده من الفرونت
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               qr_payload:
 *                 type: string
 *                 description: JSON string — snapshot QR عند الطباعة (اختياري)
 *     responses:
 *       200:
 *         description: تم الحفظ
 *   get:
 *     summary: جلب الوثيقة النهائية المحفوظة
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: مسار PDF النهائي
 */
router.post(
  '/:transactionId/final-document',
  authMiddleware,
  runMulterUpload(uploadFinalTransactionPdf.single('file')),
  uploadFinalDocumentController
)

router.get(
  '/:transactionId/final-document',
  authMiddleware,
  getFinalDocumentController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/integrity-chain/verify:
 *   get:
 *     summary: Verify transaction integrity chain (public — for QR scan)
 *     description: تحقق عام من سلسلة التواقيع. لا يتطلب تسجيل دخول.
 *     tags: [Transaction]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
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
 *     tags: [Transaction]
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               head_hash:
 *                 type: string
 *               genesis_hash:
 *                 type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/IntegrityChainVerifyResult'
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
 *     description: يعرض سلسلة التواقيع الرقمية وبيانات QR للمعاملة. يتطلب Bearer token وملكية المعاملة.
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

/**
 * @swagger
 * /api/transaction/{transactionId}:
 *   get:
 *     summary: Get transaction by ID
 *     description: يجلب المعاملة للمستخدم المالك فقط.
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
 *     responses:
 *       200:
 *         description: تمت العملية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionOutput'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:transactionId',
  authMiddleware,
  getTransactionController
)

module.exports = router
