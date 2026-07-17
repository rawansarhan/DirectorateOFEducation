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
  getFirstStageContentController,
  submitTransactionController
} = require('../controllers/transactionController')

const {
  getIntegrityChainController,
  verifyIntegrityChainController
} = require('../../integrityChain/controllers/integrityChainController')

const {
  getTransactionDocumentsController
} = require('../../document/controllers/transactionDocumentsController')

const {
  getCertificateController,
  uploadFinalDocumentController,
  getFinalDocumentController,
  generateFinalDocumentController,
  getFinalDocumentReadinessController
} = require('../../certificate/controllers/transactionCertificateController')

const {
  uploadFinalTransactionPdf,
  runMulterUpload
} = require('../../../../core/middleware/upload')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const { submitTransactionLimiter, signingChallengeLimiter, completeTaskLimiter, finalDocumentLimiter } = require('../../../../core/security/rateLimitMiddleware')
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
 *       يعرض كل معاملات المستخدم المسجّل مع اسم العملية، المرحلة الحالية، ونسبة الإنجاز،
 *       وحقل `is_complaint` لمعرفة إن كانت المعاملة شكوى أم لا.
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
 *           enum: [draft, submitted, in_progress, completed, rejected]
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
 *     summary: بيانات الشهادة للطباعة (transaction_history)
 *     description: |
 *       **الترتيب المقترح:** 1) هذا الـ API → 2) الفرونت يبني PDF → 3) POST final-document
 *
 *       يجمع كل ما يحتاجه الفرونت:
 *       - `transaction_history` (id_process + applicant + stages + templates.generated_pdf_path)
 *       - `final_document` إن وُجدت
 *
 *       ملاحظة: لا يتضمّن هذا الرد أي بيانات QR / سلسلة نزاهة.
 *
 *       **Auth:** Bearer — مالك المعاملة (المواطن) فقط
 *       **الحالة:** completed فقط
 *       **للموظف:** GET /api/workflow/transactions/{transactionId}/certificate
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
 *         description: تم جلب بيانات الشهادة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CertificateBundleResponse'
 *       400:
 *         description: المعاملة ليست completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: لا تملك صلاحية الوصول
 *       404:
 *         description: المعاملة غير موجودة
 */
router.get(
  '/:transactionId/certificate',
  authMiddleware,
  getCertificateController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/documents:
 *   get:
 *     summary: كل ملفات المعاملة (GENERATE_PDF + file_picker) + QR النهائي
 *     description: |
 *       يُرجِع لمعاملة واحدة:
 *       - `generated_documents`: كل ملفات GENERATE_PDF (من document_instance) مع content_hash.
 *       - `uploaded_files`: كل ملفات file_picker المرفوعة (من document_signature) مع نوع الوثيقة.
 *       - `final_qr`: رمز QR النهائي للمعاملة وفق الطريقة المعتمدة (توقيع سلطة الإصدار — مؤشّر حيّ لسلسلة التواقيع).
 *
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
 *         description: معرّف المعاملة
 *     responses:
 *       200:
 *         description: تم جلب وثائق المعاملة بنجاح
 *       400:
 *         description: معرّف غير صالح
 *       403:
 *         description: لا تملك صلاحية الوصول
 *       404:
 *         description: المعاملة غير موجودة
 */
router.get(
  '/:transactionId/documents',
  authMiddleware,
  getTransactionDocumentsController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document/readiness:
 *   get:
 *     summary: فحص جاهزية الوثيقة النهائية للدمج
 *     description: |
 *       يُرجع checklist لحالة GENERATE_PDF والمرفقات وسلسلة التواقيع ومفاتيح السلطة.
 *       `flush=true` يعالج فوراً أحداث outbox المعلّقة/الفاشلة لهذه المعاملة قبل الفحص.
 *     tags: [Certificate & Integrity Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: flush
 *         schema:
 *           type: boolean
 *         description: معالجة فورية لأحداث GENERATE_PDF في outbox قبل الفحص
 *     responses:
 *       200:
 *         description: نتيجة فحص الجاهزية
 */
router.get(
  '/:transactionId/final-document/readiness',
  authMiddleware,
  getFinalDocumentReadinessController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document/generate:
 *   post:
 *     summary: توليد PDF نهائي مدمج (غلاف QR + كل GENERATE_PDF + كل file_picker)
 *     description: |
 *       يبني الخادم ملف PDF واحد:
 *       1) صفحة غلاف فيها رمز QR النهائي للمعاملة (الموقّع من سلطة الإصدار).
 *       2) كل ملفات GENERATE_PDF.
 *       3) كل ملفات file_picker المرفوعة (PDF تُنسخ صفحاتها، والصور تُدرج كصفحات).
 *
 *       **يفضّل أولاً:** GET /final-document/readiness — يُرفض الدمج إذا GENERATE_PDF أو المرفقات غير جاهزة.
 *
 *       يُحفظ ويُسجَّل كـ final_document (يستبدل النسخة السابقة إن وُجدت) ويُحسب content_hash.
 *
 *       **Auth:** Bearer — مالك المعاملة | **الحالة:** completed فقط
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
 *         description: معرّف المعاملة
 *       - in: query
 *         name: force
 *         required: false
 *         schema:
 *           type: boolean
 *         description: عند true يعيد توليد الوثيقة المدمجة ويستبدل النسخة المحفوظة سابقاً (مفيد بعد تغيير الإعدادات/الترتيب)
 *     responses:
 *       200:
 *         description: تم توليد الوثيقة النهائية المدمجة بنجاح
 *       400:
 *         description: لا توجد وثائق للدمج أو الحالة ليست completed
 *       403:
 *         description: لا تملك صلاحية الوصول
 *       404:
 *         description: المعاملة غير موجودة
 */
router.post(
  '/:transactionId/final-document/generate',
  authMiddleware,
  finalDocumentLimiter,
  generateFinalDocumentController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document:
 *   post:
 *     summary: رفع وحفظ PDF النهائي بعد توليده من الفرونت
 *     description: |
 *       يرفع PDF الشهادة بعد أن يولّده الفرونت من بيانات GET /certificate.
 *       **Auth:** Bearer — مالك المعاملة
 *       **الحالة:** completed فقط
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
 *                 description: ملف PDF النهائي (إلزامي)
 *               qr_payload:
 *                 type: string
 *                 description: JSON string — snapshot QR عند الطباعة (اختياري؛ إن تُرك فارغاً يُؤخذ من integrity chain)
 *                 example: '{"v":1,"tx":12,"genesis":"abc","head":"def","links":2}'
 *     responses:
 *       200:
 *         description: تم حفظ الوثيقة النهائية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FinalDocumentRecord'
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: لا تملك صلاحية الوصول
 *       404:
 *         description: المعاملة غير موجودة
 *   get:
 *     summary: جلب الوثيقة النهائية المحفوظة
 *     description: |
 *       يرجع سجل PDF النهائي المحفوظ سابقاً عبر POST.
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
 *         description: تم جلب الوثيقة النهائية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FinalDocumentRecord'
 *       404:
 *         description: لا توجد وثيقة نهائية محفوظة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
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

/**
 * @swagger
 * /api/transaction/{transactionId}/first-stage:
 *   get:
 *     summary: عرض طلب مقدم الطلب (مرحلة AUTH الأولى)
 *     description: |
 *       يعرض محتوى مرحلة التقديم (AUTH) كما سُجّل في transaction.data.
 *       يُرجع البيانات فقط إذا completed_by يساوي user_id المستخدم من التوكن.
 *       للمالك فقط (transaction.user_id).
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
 *         description: تم جلب محتوى المرحلة الأولى
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionFirstStageEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب محتوى المرحلة الأولى بنجاح
 *               data:
 *                 transaction_id: 42
 *                 stage_code: Activity_0wvfirz
 *                 stage_name: تقديم الطلب
 *                 auth_type: AUTH
 *                 completed_by: 3
 *                 content:
 *                   stage_name: تقديم الطلب
 *                   form_id: leave_process_auth
 *                   form_name: الوثائق المطلوبة للمواطن
 *                   decision: null
 *                   note: ''
 *                   rejection_reason: null
 *                   completed_by: 3
 *                   completed_at: 15/01/2026
 *                   widgets:
 *                     - widget_type: text_field
 *                       data:
 *                         id: student_first_name
 *                         label: اسم الطالب
 *                         is_required: true
 *                       value: روان
 *                     - widget_type: text_field
 *                       data:
 *                         id: student_father_name
 *                         label: اسم الأب
 *                         is_required: true
 *                       value: أحمد
 *                     - widget_type: file_picker
 *                       data:
 *                         id: birth_certificate
 *                         label: شهادة الميلاد
 *                         is_required: true
 *                       value:
 *                         - path: /uploads/1779540194357-birth-cert.pdf
 *                           url: http://localhost:4000/uploads/1779540194357-birth-cert.pdf
 *                   templates:
 *                     - id_template: 1
 *                       id_document_instance: 55
 *                       generated_pdf_path: /uploads/final/tx-42-template.pdf
 *                       value:
 *                         student_name: روان
 *                         father_name: أحمد
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: المعاملة ليست ملك المستخدم المصادق
 *       404:
 *         description: المعاملة غير موجودة أو لا يوجد طلب مقدّم محفوظ
 */
router.get(
  '/:transactionId/first-stage',
  authMiddleware,
  getFirstStageContentController
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
