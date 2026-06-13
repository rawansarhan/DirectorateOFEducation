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

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const { submitTransactionLimiter } = require('../../../../core/security/rateLimitMiddleware')

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
 * /api/transaction/submit/{transactionId}:
 *   post:
 *     summary: Submit transaction and start workflow
 *     description: |
 *       يقدّم المعاملة ويبدأ الـ workflow مباشرة.
 *
 *       **التدفق:**
 *       1. أولاً: `POST /api/transaction/updateDraft/{processId}` — حفظ بيانات الهوية والحصول على `draft.id`
 *       2. ثانياً: `POST /api/transaction/submit/{transactionId}` — إرسال الاستمارة على المسودة نفسها
 *       3. يُولَّد `id_process` (مثل STUTR-2026-001) ويُبدأ Camunda workflow
 *
 *       **قالب الطلب (إلزامي):** `form_id`, `form_name`, `widgets[]` (config_json + value), `templates[]` ({ id, value }), `note`
 *       **مرفوض:** `fields`, `files`, `signature`, `variables`, `employee`, `decision`, `stage_name`
 *       **القالب الفارغ:** GET `/api/stage_config/config/{processId}`
 *       - Idempotency تلقائي على مستوى `transactionId` — لا ترسل Idempotency-Key
 *
 *       **Response `data`:** `id`, `id_process`, `status`, `idempotency_key`, ...
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
 *         description: معرّف المسودة (transaction id) من خطوة updateDraft
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitTransactionPayload'
 *           examples:
 *             leave_auth:
 *               $ref: '#/components/examples/LeaveProcessAuthSubmit'
 *     responses:
 *       200:
 *         description: تم تقديم المعاملة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitTransactionResponse'
 *       400:
 *         description: خطأ تحقق أو معاملة قيد التنفيذ
 *       403:
 *         description: غير مصرّح
 *       404:
 *         description: العملية غير موجودة
 *       502:
 *         description: فشل بدء workflow
 */
router.post(
  '/submit/:transactionId',
  authMiddleware,
  submitTransactionLimiter,
  submitTransactionController
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
