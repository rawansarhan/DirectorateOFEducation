'use strict'

const express = require('express')
const router = express.Router()

const {
  getCertificateController,
  uploadFinalDocumentController,
  getFinalDocumentController,
  getFinalDocumentGeneralController
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
 *       - `transaction_history` (id_process + applicant + stages + templates.generated_pdf_path)
 *       - `final_document` إن وُجدت
 *
 *       ملاحظة: لا يتضمّن هذا الرد أي بيانات QR / سلسلة نزاهة.
 *
 *       **Auth:** Bearer (تسجيل دخول فقط — بدون تقييد مالك/دور داخل المنطق)
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

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document/general:
 *   get:
 *     summary: جلب الوثيقة النهائية المحفوظة (بدون تقييد مالك)
 *     description: |
 *       يعيد نفس سجل الوثيقة النهائية، لكن بدون شرط أن يكون المستخدم مالك المعاملة.
 *       يتطلب فقط مستخدم مسجّل الدخول.
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
 *     responses:
 *       200:
 *         description: تم جلب الوثيقة النهائية بنجاح
 *       404:
 *         description: لا توجد وثيقة نهائية محفوظة
 */
router.get(
  '/:transactionId/final-document/general',
  authMiddleware,
  getFinalDocumentGeneralController
)

module.exports = router
