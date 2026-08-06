'use strict'

const express = require('express')
const router = express.Router()

const {
  getCertificateController,
  uploadFinalDocumentController,
  getFinalDocumentController,
  deleteFinalDocumentController,
  listMyFinalDocumentsController
} = require('../controllers/transactionCertificateController')

const {
  uploadFinalTransactionPdf,
  runMulterUpload
} = require('../../../../core/middleware/upload')

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/transaction/my/final-documents:
 *   get:
 *     summary: كل الوثائق النهائية لمعاملات المستخدم المسجّل
 *     description: |
 *       يعرض كل سجلات `document_final_transactions` لمعاملات يملكها المستخدم
 *       من التوكن (`transaction.user_id = auth user`) مع ترقيم صفحات.
 *
 *       **Auth:** Bearer فقط (مالك المعاملات)
 *     tags: [Certificate & Integrity Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 70
 *           default: 20
 *         example: 20
 *     responses:
 *       200:
 *         description: تم جلب الوثائق النهائية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MyFinalDocumentsResponse'
 *             examples:
 *               with_items:
 *                 summary: قائمة وثائق نهائية مع ترقيم
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب الوثائق النهائية لمعاملاتك بنجاح
 *                   data:
 *                     items:
 *                       - id: 3
 *                         transaction_id: 12
 *                         file_path: /uploads/final-documents/final-txn-12.pdf
 *                         file_url: /uploads/final-documents/final-txn-12.pdf
 *                         original_name: certificate-12.pdf
 *                         mime_type: application/pdf
 *                         file_size_bytes: 245760
 *                         generated_at: "2026-08-05T18:30:00.000Z"
 *                         transaction:
 *                           id: 12
 *                           id_process: 4
 *                           code: LEAVE_PROCESS_01
 *                           status: completed
 *                       - id: 2
 *                         transaction_id: 9
 *                         file_path: /uploads/final-documents/final-txn-9.pdf
 *                         file_url: /uploads/final-documents/final-txn-9.pdf
 *                         original_name: certificate-9.pdf
 *                         mime_type: application/pdf
 *                         file_size_bytes: 198432
 *                         generated_at: "2026-08-01T10:15:00.000Z"
 *                         transaction:
 *                           id: 9
 *                           id_process: 2
 *                           code: CIVIL_REG_01
 *                           status: completed
 *                     pagination:
 *                       page: 1
 *                       limit: 20
 *                       total: 2
 *                       total_pages: 1
 *                       has_next: false
 *                       has_prev: false
 *               empty:
 *                 summary: لا توجد وثائق نهائية بعد
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب الوثائق النهائية لمعاملاتك بنجاح
 *                   data:
 *                     items: []
 *                     pagination:
 *                       page: 1
 *                       limit: 20
 *                       total: 0
 *                       total_pages: 0
 *                       has_next: false
 *                       has_prev: false
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/my/final-documents',
  authMiddleware,
  listMyFinalDocumentsController
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
 *           examples:
 *             upload_pdf_only:
 *               summary: رفع PDF فقط (بدون qr_payload)
 *               value:
 *                 file: (binary PDF)
 *             upload_with_qr:
 *               summary: رفع PDF مع qr_payload
 *               value:
 *                 file: (binary PDF)
 *                 qr_payload: '{"v":1,"tx":12,"genesis":"a1b2c3","head":"d4e5f6","links":2,"pin":"482193"}'
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
 *             examples:
 *               saved:
 *                 summary: وثيقة نهائية محفوظة
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم حفظ الوثيقة النهائية بنجاح
 *                   data:
 *                     id: 3
 *                     file_path: /uploads/final-documents/final-txn-12.pdf
 *                     file_url: /uploads/final-documents/final-txn-12.pdf
 *                     original_name: certificate-12.pdf
 *                     mime_type: application/pdf
 *                     file_size_bytes: 245760
 *                     generated_at: "2026-08-05T18:30:00.000Z"
 *                     qr_payload_snapshot:
 *                       v: 1
 *                       tx: 12
 *                       genesis: a1b2c3
 *                       head: d4e5f6
 *                       links: 2
 *                       pin: "482193"
 *       400:
 *         description: الملف مفقود أو المعاملة ليست completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               missing_file:
 *                 summary: الملف مفقود
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: ملف PDF مطلوب
 *                   error: VALIDATION_ERROR
 *                   data: null
 *               not_completed:
 *                 summary: المعاملة ليست مكتملة
 *                 value:
 *                   success: false
 *                   status_code: 400
 *                   message: لا يمكن حفظ الوثيقة النهائية إلا بعد اكتمال المعاملة
 *                   error: BAD_REQUEST
 *                   data: null
 *       403:
 *         description: لا تملك صلاحية الوصول (لست مالك المعاملة)
 *         content:
 *           application/json:
 *             examples:
 *               not_owner:
 *                 summary: لست مالك المعاملة
 *                 value:
 *                   success: false
 *                   status_code: 403
 *                   message: لا تملك صلاحية الوصول لهذه المعاملة
 *                   error: FORBIDDEN
 *                   data: null
 *       404:
 *         description: المعاملة غير موجودة
 *         content:
 *           application/json:
 *             examples:
 *               not_found:
 *                 value:
 *                   success: false
 *                   status_code: 404
 *                   message: المعاملة غير موجودة
 *                   error: TRANSACTION_NOT_FOUND
 *                   data: null
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

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document:
 *   delete:
 *     summary: حذف الوثيقة النهائية المحفوظة
 *     description: |
 *       يحذف سجل `document_final_transactions` للمعاملة حسب `transaction_id`
 *       ويمسح ملف PDF من القرص إن وُجد، مع إبطال الكاش.
 *
 *       **Auth:** Bearer + صلاحية `DELETE_FINAL_DOCUMENT`
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
 *         description: تم حذف الوثيقة النهائية بنجاح
 *       403:
 *         description: لا تملك صلاحية DELETE_FINAL_DOCUMENT
 *       404:
 *         description: المعاملة غير موجودة أو لا توجد وثيقة نهائية
 */
router.delete(
  '/:transactionId/final-document',
  authMiddleware,
  authorize('DELETE_FINAL_DOCUMENT'),
  deleteFinalDocumentController
)

module.exports = router
