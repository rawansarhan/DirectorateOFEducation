'use strict'

const express = require('express')
const router = express.Router()

const {
  getCertificateController,
  getMyFinalDocumentController,
  getFinalDocumentController,
  listSourceDocumentsController,
  deleteFinalDocumentController,
  listMyFinalDocumentsController
} = require('../controllers/transactionCertificateController')

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
 * /api/transaction/my/{transactionId}/final-document:
 *   get:
 *     summary: وثيقتي النهائية (صاحب الطلب فقط)
 *     description: |
 *       **GET.** معامل `transactionId` فقط + Bearer.
 *       بدون file وبدون qr_payload وبدون صلاحية موظف.
 *
 *       يشوف الملف فقط إذا `transaction.user_id` = مستخدم التوكن.
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
 *         description: سجل document_final_transactions
 *         content:
 *           application/json:
 *             examples:
 *               owned:
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب الوثيقة النهائية بنجاح
 *                   data:
 *                     id: 3
 *                     transaction_id: 12
 *                     file_path: /uploads/final-merged-12-123.pdf
 *                     file_url: /uploads/final-merged-12-123.pdf
 *                     original_name: final-merged-12.pdf
 *                     mime_type: application/pdf
 *                     generated_at: "2026-08-15T18:30:00.000Z"
 *       401:
 *         description: يلزم تسجيل الدخول
 *       403:
 *         description: هذه المعاملة ليست لك
 *         content:
 *           application/json:
 *             examples:
 *               not_owner:
 *                 value:
 *                   success: false
 *                   status_code: 403
 *                   message: هذه المعاملة ليست لك — لا يمكنك الاطلاع على طلب ليس لك
 *                   error: NOT_TRANSACTION_OWNER
 *                   data: null
 *       404:
 *         description: لا يوجد ملف نهائي
 *         content:
 *           application/json:
 *             examples:
 *               no_final_file:
 *                 value:
 *                   success: false
 *                   status_code: 404
 *                   message: عذراً، لا يوجد ملف نهائي لطلبك بعد
 *                   error: FINAL_DOCUMENT_NOT_FOUND
 *                   data: null
 */
router.get(
  '/my/:transactionId/final-document',
  authMiddleware,
  getMyFinalDocumentController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/certificate:
 *   get:
 *     summary: بيانات الشهادة للطباعة (transaction_history)
 *     description: |
 *       **بيانات للطباعة/العرض — ليس ملف PDF نفسه.**
 *
 *       يجمع:
 *       - `transaction_history` + `signers`
 *       - `final_document` **metadata فقط** إن كانت محفوظة مسبقاً
 *         (`file_path` / `file_url`) — لا يولّد ولا يبثّ الملف.
 *
 *       لتوليد/جلب PDF النهائي استخدم:
 *       `GET /api/transaction/{id}/source-documents` ثم
 *       `GET /api/transaction/{id}/final-document?document_instance_ids=...&document_signature_ids=...`
 *
 *       **Auth:** Bearer + صلاحية `VIEW_HISTORY_TRANSACTION`
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
 * /api/transaction/{transactionId}/source-documents:
 *   get:
 *     summary: عرض document_instance + document_signature لمعاملة
 *     description: |
 *       قائمة الملفات المرشّحة لبناء الوثيقة النهائية.
 *       `document_signatures` تعرض الملفات المرفوعة فقط (مع `name` = file_picker.label).
 *       `document_instances` تعرض `name` = document_templates.name.
 *       سجلات التوقيع الاصطناعي `transaction://...` لا تُعاد.
 *       استخدم الـ `id` منها في `GET .../final-document`.
 *
 *       **Auth:** Bearer + `VIEW_CREATE_FINAL_DOCUMENT`
 *     tags: [Certificate & Integrity Chain]
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
 *         description: قوائم document_instances و document_signatures
 */
router.get(
  '/:transactionId/source-documents',
  authMiddleware,
  authorize('VIEW_CREATE_FINAL_DOCUMENT'),
  listSourceDocumentsController
)

/**
 * @swagger
 * /api/transaction/{transactionId}/final-document:
 *   get:
 *     summary: توليد/جلب الوثيقة النهائية (موظف)
 *     description: |
 *       للموظف بصلاحية `VIEW_CREATE_FINAL_DOCUMENT`.
 *       أرسلي `file_order` أو `document_instance_ids` / `document_signature_ids`.
 *
 *       صاحب الطلب يعرض وثيقته من:
 *       `GET /api/transaction/my/{transactionId}/final-document`
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
 *       - in: query
 *         name: file_order
 *         schema:
 *           type: string
 *         description: اختياري — توليد للموظف فقط، اتركيه فارغاً للعرض
 *       - in: query
 *         name: document_instance_ids
 *         schema:
 *           type: string
 *         description: اختياري — توليد للموظف فقط
 *       - in: query
 *         name: document_signature_ids
 *         schema:
 *           type: string
 *         description: اختياري — توليد للموظف فقط
 *     responses:
 *       200:
 *         description: سجل document_final_transactions
 *         content:
 *           application/json:
 *             examples:
 *               owned:
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب الوثيقة النهائية بنجاح
 *                   data:
 *                     id: 3
 *                     transaction_id: 12
 *                     file_path: /uploads/final-merged-12-123.pdf
 *                     file_url: /uploads/final-merged-12-123.pdf
 *                     original_name: final-merged-12.pdf
 *                     mime_type: application/pdf
 *                     file_size_bytes: 245760
 *                     generated_at: "2026-08-15T18:30:00.000Z"
 *       403:
 *         description: هذه المعاملة ليست لك
 *         content:
 *           application/json:
 *             examples:
 *               not_owner:
 *                 value:
 *                   success: false
 *                   status_code: 403
 *                   message: هذه المعاملة ليست لك — لا يمكنك الاطلاع على طلب ليس لك
 *                   error: NOT_TRANSACTION_OWNER
 *                   data: null
 *       404:
 *         description: لا توجد وثيقة نهائية محفوظة
 *         content:
 *           application/json:
 *             examples:
 *               no_final_file:
 *                 value:
 *                   success: false
 *                   status_code: 404
 *                   message: عذراً، لا يوجد ملف نهائي لطلبك بعد
 *                   error: FINAL_DOCUMENT_NOT_FOUND
 *                   data: null
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
