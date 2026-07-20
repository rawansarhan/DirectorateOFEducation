'use strict'

const express = require('express')
const router = express.Router()

const {
  getCertificateController,
  uploadFinalDocumentController,
  getFinalDocumentController,
  generateFinalDocumentController,
  getFinalDocumentReadinessController
} = require('../controllers/transactionCertificateController')

const {
  uploadFinalTransactionPdf,
  runMulterUpload
} = require('../../../../core/middleware/upload')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const {
  finalDocumentLimiter
} = require('../../../../core/security/rateLimitMiddleware')

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
 * /api/transaction/{transactionId}/final-document/readiness:
 *   get:
 *     summary: فحص جاهزية الوثيقة النهائية للدمج
 *     description: |
 *       يُرجع checklist لحالة GENERATE_PDF والمرفقات وسلسلة التواقيع ومفاتيح السلطة.
 *       `flush=true` يعالج فوراً أحداث outbox المعلّقة/الفاشلة لهذه المعاملة قبل الفحص.
 *
 *       **Auth:** Bearer — **مالك المعاملة فقط**
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
 *       403:
 *         description: لست مالك هذه المعاملة
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
 *       **Auth:** Bearer — **مالك المعاملة فقط**
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
 *         description: معرّف المعاملة
 *       - in: query
 *         name: force
 *         required: false
 *         schema:
 *           type: boolean
 *         description: عند true يعيد توليد الوثيقة المدمجة ويستبدل النسخة المحفوظة سابقاً
 *     responses:
 *       200:
 *         description: تم توليد الوثيقة النهائية المدمجة بنجاح
 *       400:
 *         description: لا توجد وثائق للدمج أو الحالة ليست completed
 *       403:
 *         description: لست مالك هذه المعاملة
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

module.exports = router
