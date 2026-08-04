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

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/transaction/{transactionId}/certificate:
 *   get:
 *     summary: بيانات الشهادة للطباعة (transaction_history)
 *     description: |
 *       **الترتيب المقترح:** 1) هذا الـ API → 2) الفرونت يبني PDF → 3) POST final-document
 *
 *       يجمع كل ما يحتاجه الفرونت:
 *       - `transaction_history` (process_name + applicant + stages)
 *       - `transaction_history`: مراحل USER_TASK فقط؛ ملف GENERATE_PDF داخل
 *         `templates[].value` (`id_template` + `value` فقط)
 *       - `signers` سلسلة التواقيع مرتبة: من وقّع كل مرحلة
 *         (الاسم الأول/الأخير، اسم الأب، اسم الأم، الرقم الوطني)
 *       - `final_document` إن وُجدت
 *
 *       ملاحظة: لا يتضمّن هذا الرد أي بيانات QR / سلسلة نزاهة.
 *
 *       **Auth:** Bearer + صلاحية `VIEW_HISTORY_TRANSACTION`
 *       **الحالة:** أي حالة — يعرض `transaction_history` المتاح.
 *       `completed_at` يكون `null` إن لم تكن completed؛ `final_document` إن وُجدت فقط.
 *
 *       **شكل data:**
 *       - transaction_id, status, process_name, process_priority
 *       - submitted_at, completed_at
 *       - signers: [{ signature_order, stage_code, stage_name, signed_at, user_id,
 *         first_name, last_name, father_name, mother_name, national_id }]
 *       - transaction_history: { process_name, priority, data }
 *       - final_document: سجل الوثيقة أو `{ available: false, message }`
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
  authorize('VIEW_HISTORY_TRANSACTION'),
  getCertificateController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document:
 *   post:
 *     summary: رفع وحفظ PDF النهائي بعد توليده من الفرونت
 *     description: |
 *       يرفع الفرونت ملف PDF الشهادة بعد بنائه من بيانات
 *       `GET /api/transaction/{transactionId}/certificate`، فيُحفَظ كوثيقة نهائية للمعاملة.
 *
 *       **Auth:** Bearer — **مالك المعاملة فقط**
 *
 *       **الحالة:** `completed` فقط
 *
 *       **ملاحظات:**
 *       - `file` إلزامي ونوعه PDF.
 *       - `qr_payload` اختياري؛ إن تُرك فارغاً يُؤخذ snapshot الـ QR من سلسلة النزاهة.
 *       - رفع ملف جديد يستبدل الوثيقة النهائية السابقة لنفس المعاملة.
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
 *                 description: JSON string — snapshot QR عند الطباعة (اختياري)
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
 *         description: الملف مفقود أو المعاملة ليست completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: لا تملك صلاحية الوصول (لست مالك المعاملة)
 *       404:
 *         description: المعاملة غير موجودة
 */
router.post(
  '/:transactionId/final-document',
  authMiddleware,
  runMulterUpload(uploadFinalTransactionPdf.single('file')),
  uploadFinalDocumentController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document:
 *   get:
 *     summary: جلب الوثيقة النهائية (أو توليدها إن لم تكن محفوظة)
 *     description: |
 *       يجلب الوثيقة النهائية اعتماداً على `transaction_id` فقط — **بدون تقييد بمالك المعاملة**.
 *
 *       **السلوك:**
 *       - إن وُجدت وثيقة نهائية محفوظة → تُعاد كما هي.
 *       - إن لم توجد والمعاملة `completed` → يولّدها السيرفر (دمج المرفقات + ملفات
 *         GENERATE_PDF مع صفحة غلاف تحمل رمز QR) ثم يعيدها.
 *       - إن كانت محفوظة بدون QR وسلسلة التواقيع جاهزة → يُعاد توليدها لتتضمّن QR.
 *       - إن لم تكن المعاملة `completed` ولا توجد وثيقة محفوظة → `404`.
 *
 *       **Auth:** Bearer + صلاحية `VIEW_CREATE_FINAL_DOCUMENT`
 *
 *       ملاحظة: **POST** على نفس المسار يبقى مقتصراً على مالك المعاملة.
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
 *         description: تم جلب/توليد الوثيقة النهائية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FinalDocumentRecord'
 *       403:
 *         description: لا تملك صلاحية VIEW_CREATE_FINAL_DOCUMENT
 *       404:
 *         description: المعاملة غير موجودة أو لا توجد وثيقة نهائية ولا يمكن توليدها
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/:transactionId/final-document',
  authMiddleware,
  authorize('VIEW_CREATE_FINAL_DOCUMENT'),
  getFinalDocumentController
)

module.exports = router
