'use strict'

const express = require('express')
const router = express.Router()

const {
  getCertificateController,
  uploadFinalDocumentController,
  getFinalDocumentController
} = require('../controllers/transactionCertificateController')

const {
  uploadFinalTransactionPdf,
  runMulterUpload
} = require('../../../../core/middleware/upload')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/transaction/{transactionId}/certificate:
 *   get:
 *     summary: بيانات الشهادة للطباعة (transaction_history)
 *     description: |
 *       **الترتيب المقترح:** 1) هذا الـ API → 2) الفرونت يبني PDF → 3) POST final-document
 *
 *       يجمع كل ما يحتاجه الفرونت:
 *       - `transaction_history` (process_name + applicant + stages؛ PDF على مرحلة GENERATE_PDF)
 *       - `final_document` إن وُجدت
 *
 *       ملاحظة: لا يتضمّن هذا الرد أي بيانات QR / سلسلة نزاهة.
 *
 *       **Auth:** Bearer (تسجيل دخول فقط — بدون تقييد مالك/دور داخل المنطق)
 *       **الحالة:** أي حالة (draft / submitted / in_progress / completed / rejected)
 *       — يعرض `transaction_history` المتاح حتى لو لم تكتمل المعاملة.
 *       `completed_at` يكون `null` إن لم تكن completed؛ `final_document` إن وُجدت فقط.
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

module.exports = router
