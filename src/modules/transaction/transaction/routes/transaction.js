'use strict'

const express = require('express')
const router = express.Router()

const {
  createDraftController,
  updateDraftController,
  upsertDraftController,
  getUserDraftByProcessController,
  getTransactionController,
  submitTransactionController
} = require('../controllers/transactionController')

const {
  getIntegrityChainController,
  verifyIntegrityChainController
} = require('../../integrityChain/controllers/integrityChainController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

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
 *       يدمج إنشاء وتحديث المسودة:
 *       - إن وُجدت مسودة للمستخدم على هذه العملية يُعاد سجلها (ويُحدَّث إن وُجد body).
 *       - إن لم توجد مسودة يُنشأ سجل جديد.
 *       يدعم حقول الهوية (first_name, last_name, father_name, mother_name, national_id) وبيانات JSON إضافية.
 *       يُطبَّق retry مع exponential backoff عند الأخطاء العابرة.
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
 * /api/transaction/updateDraft/{transId}:
 *   post:
 *     summary: Update existing draft
 *     description: يحدّث بيانات المسودة (`data`) دون تغيير الحالة.
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionDraftUpsertInput'
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
  '/updateDraft/:transId',
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
 * /api/transaction/{transactionId}/submit:
 *   post:
 *     summary: Submit transaction and start workflow
 *     description: |
 *       يقدّم المعاملة من `draft` إلى `submitted` ويبدأ الـ workflow عبر outbox.
 *       يتحقق من بيانات مرحلة AUTH حسب `stage_config`.
 *       يُنشئ `genesis_hash` لسلسلة النزاهة.
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
 *             $ref: '#/components/schemas/StageSubmissionPayload'
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
router.post(
  '/:transactionId/submit',
  authMiddleware,
  submitTransactionController
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
