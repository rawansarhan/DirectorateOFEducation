'use strict'

const express = require('express')
const router = express.Router()

const {
  createDraftController,
  updateDraftController,
  upsertDraftController,
  getUserDraftByProcessController
} = require('../controllers/transactionController')

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

module.exports = router
