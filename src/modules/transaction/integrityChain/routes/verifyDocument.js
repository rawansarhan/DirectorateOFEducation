'use strict'

const express = require('express')
const router = express.Router()

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')
const {
  verifyDocumentController,
  getDocumentVerifyDetailsController,
  getDocumentVerifyDetailsByTransactionController
} = require('../controllers/integrityChainController')

/**
 * @swagger
 * /api/verify/document:
 *   get:
 *     summary: Verify a generated document via its QR code (public)
 *     description: |
 *       شاشة عامة للتحقق (بدون مصادقة) عند مسح QR.
 *       عند النجاح يُصدر **رمز تفاصيل جديد** (6 أرقام) صالح **5 دقائق فقط**.
 *       استخدمه في `GET /api/verify/document/details?code=<details_code>` مع Bearer token.
 *     tags: [IntegrityChain]
 *     parameters:
 *       - in: query
 *         name: tx
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: g
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: doc
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: s
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [html, json] }
 *         description: html (افتراضي للمتصفح) | json للتطبيق
 *     responses:
 *       200:
 *         description: نتيجة عامة + details_code عند النجاح
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               message: الوثيقة صحيحة وسلسلة التواقيع صالحة
 *               data:
 *                 valid: true
 *                 verified_at: 2026-07-18T22:00:00.000Z
 *                 identity:
 *                   first_name: أحمد
 *                   last_name: علي
 *                   father_name: محمد
 *                   mother_name: فاطمة
 *                   national_id: "01234567890"
 *                 details_code: "482913"
 *                 details_code_expires_in_seconds: 300
 *       400:
 *         description: بيانات غير صالحة أو الوثيقة غير موثوقة
 *       404:
 *         description: المعاملة غير موجودة
 */
router.get('/document', verifyDocumentController)

/**
 * @swagger
 * /api/verify/document/details:
 *   get:
 *     summary: تفاصيل المعاملة بعد مسح QR (رمز مؤقت 6 أرقام)
 *     description: |
 *       أرسل `code` (6 أرقام) الذي ظهر بعد مسح QR عبر `/api/verify/document`.
 *       الرمز صالح **5 دقائق** فقط من لحظة إصداره.
 *
 *       يعيد: الموقّعين، طالب المعاملة، transaction_history، final_document،
 *       تاريخ الطلب وتاريخ الإكمال/الرفض.
 *     tags: [IntegrityChain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 6
 *           maxLength: 6
 *           pattern: '^[0-9]{6}$'
 *           example: '482913'
 *         description: رمز التحقق من QR (6 أرقام إنجليزية 0-9)
 *         example: '482913'
 *     responses:
 *       200:
 *         description: تفاصيل التحقق
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب تفاصيل التحقق من الوثيقة بنجاح
 *               data:
 *                 applicant:
 *                   first_name: أحمد
 *                   last_name: علي
 *                   father_name: محمد
 *                   mother_name: فاطمة
 *                   national_id: "01234567890"
 *                 signers:
 *                   - signature_order: 1
 *                     first_name: سلى
 *                     last_name: أحمد
 *                     father_name: خالد
 *                     mother_name: مريم
 *                     national_id: "09876543210"
 *                 transaction:
 *                   id: 42
 *                   status: completed
 *                   request_date: 01/07/2026
 *                   completed_at: 18/07/2026
 *                   rejected_at: null
 *                 transaction_history:
 *                   id_process: TX-2026-00042
 *                   data: {}
 *                 final_document:
 *                   available: true
 *                   file_url: https://host/uploads/final/tx-42.pdf
 *       401:
 *         description: Bearer token مطلوب أو غير صالح
 *       400:
 *         description: رمز غير صالح أو منتهٍ الصلاحية
 *       404:
 *         description: المعاملة غير موجودة
 */
router.get('/document/details',
   authMiddleware,
   authorize('DOCUMENT_VERIFY_BY_CODE'), 
   getDocumentVerifyDetailsController)

/**
 * @swagger
 * /api/verify/document/details/by-transaction:
 *   get:
 *     summary: تفاصيل المعاملة عبر transaction_id
 *     description: |
 *       نفس بيانات `GET /api/verify/document/details` لكن عبر `transaction_id`
 *       بدل رمز التفاصيل المؤقت.
 *
 *       **Auth:** Bearer + صلاحية `DOCUMENT_VERIFY_BY_CODE`
 *
 *       ### يعيد
 *       - `applicant` هوية طالب المعاملة
 *       - `signers` سلسلة الموقّعين بالترتيب
 *       - `transaction` حالة المعاملة + تواريخ الطلب/الإكمال/الرفض
 *       - `transaction_history` مراحل USER_TASK فقط؛ ملفات GENERATE_PDF داخل
 *         `templates[].value` (`id_template` + `value` مع `id_document_instance` /
 *         `generated_pdf_path` / `generated_pdf_url` إن وُجدت)
 *       - `final_document` إن وُجدت، وإلا `{ available: false, message }`
 *
 *       ### أمثلة طلب
 *       - `/api/verify/document/details/by-transaction?transaction_id=42`
 *     tags: [IntegrityChain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: transaction_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: معرّف المعاملة
 *         example: 42
 *     responses:
 *       200:
 *         description: تفاصيل التحقق
 *         content:
 *           application/json:
 *             examples:
 *               completed_with_final_document:
 *                 summary: معاملة مكتملة + وثيقة نهائية + تاريخ مراحل
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب تفاصيل التحقق من الوثيقة بنجاح
 *                   data:
 *                     transaction:
 *                       id: 42
 *                       id_process: 4
 *                       status: completed
 *                       process_name: طلب إجازة
 *                       request_date: 01/07/2026
 *                       completed_at: 18/07/2026
 *                       rejected_at: null
 *                     applicant:
 *                       first_name: أحمد
 *                       last_name: علي
 *                       father_name: محمد
 *                       mother_name: فاطمة
 *                       national_id: "01234567890"
 *                     signers:
 *                       - signature_order: 1
 *                         stage_code: REVIEW_STAGE
 *                         signed_at: "2026-07-10T09:15:00.000Z"
 *                         user_id: 12
 *                         first_name: سارة
 *                         last_name: أحمد
 *                         father_name: خالد
 *                         mother_name: مريم
 *                         national_id: "09876543210"
 *                       - signature_order: 2
 *                         stage_code: APPROVE_STAGE
 *                         signed_at: "2026-07-18T11:40:00.000Z"
 *                         user_id: 8
 *                         first_name: عمر
 *                         last_name: خليل
 *                         father_name: حسن
 *                         mother_name: ليلى
 *                         national_id: "01112223334"
 *                     transaction_history:
 *                       process_name: طلب إجازة
 *                       priority: 2
 *                       data:
 *                         applicant:
 *                           first_name: أحمد
 *                           last_name: علي
 *                           father_name: محمد
 *                           mother_name: فاطمة
 *                           national_id: "01234567890"
 *                         stages:
 *                           - stage_code: AUTH
 *                             stage_name: تقديم الطلب
 *                             widgets: []
 *                             templates:
 *                               - id_template: 7
 *                                 value:
 *                                   full_name: أحمد علي
 *                                   leave_days: "5"
 *                                   id_document_instance: 15
 *                                   generated_pdf_path: /uploads/generated-15.pdf
 *                                   generated_pdf_url: /uploads/generated-15.pdf
 *                           - stage_code: REVIEW_STAGE
 *                             stage_name: مراجعة الموظف
 *                             widgets: []
 *                             templates: []
 *                     final_document:
 *                       available: true
 *                       id: 9
 *                       file_path: /uploads/final-merged-42.pdf
 *                       file_url: /uploads/final-merged-42.pdf
 *                       original_name: final-merged-42.pdf
 *                       mime_type: application/pdf
 *                       file_size_bytes: 245760
 *                       generated_at: "2026-07-18T12:00:00.000Z"
 *               rejected_no_final_document:
 *                 summary: معاملة مرفوضة بدون وثيقة نهائية
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب تفاصيل التحقق من الوثيقة بنجاح
 *                   data:
 *                     transaction:
 *                       id: 55
 *                       id_process: 4
 *                       status: rejected
 *                       process_name: طلب إجازة
 *                       request_date: 05/07/2026
 *                       completed_at: null
 *                       rejected_at: 08/07/2026
 *                     applicant:
 *                       first_name: علي
 *                       last_name: حسن
 *                       father_name: محمود
 *                       mother_name: ندى
 *                       national_id: "05556667778"
 *                     signers:
 *                       - signature_order: 1
 *                         stage_code: REVIEW_STAGE
 *                         signed_at: "2026-07-08T10:00:00.000Z"
 *                         user_id: 12
 *                         first_name: سارة
 *                         last_name: أحمد
 *                         father_name: خالد
 *                         mother_name: مريم
 *                         national_id: "09876543210"
 *                     transaction_history:
 *                       process_name: طلب إجازة
 *                       priority: 2
 *                       data:
 *                         applicant:
 *                           first_name: علي
 *                           last_name: حسن
 *                         stages:
 *                           - stage_code: AUTH
 *                             stage_name: تقديم الطلب
 *                             templates: []
 *                     final_document:
 *                       available: false
 *                       message: لم يتم توليد الوثيقة النهائية لهذه المعاملة بعد
 *               running_minimal:
 *                 summary: معاملة قيد المعالجة (بدون موقّعين / بدون final)
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب تفاصيل التحقق من الوثيقة بنجاح
 *                   data:
 *                     transaction:
 *                       id: 60
 *                       id_process: 2
 *                       status: submitted
 *                       process_name: قيد مدني
 *                       request_date: 11/08/2026
 *                       completed_at: null
 *                       rejected_at: null
 *                     applicant:
 *                       first_name: ليلى
 *                       last_name: سمير
 *                       father_name: يوسف
 *                       mother_name: هالة
 *                       national_id: "09998887776"
 *                     signers: []
 *                     transaction_history:
 *                       process_name: قيد مدني
 *                       priority: 1
 *                       data:
 *                         applicant:
 *                           first_name: ليلى
 *                           last_name: سمير
 *                         stages: []
 *                     final_document:
 *                       available: false
 *                       message: لم يتم توليد الوثيقة النهائية لهذه المعاملة بعد
 *       400:
 *         description: معرّف المعاملة غير صالح
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               status_code: 400
 *               message: معرّف المعاملة غير صالح
 *               error: BAD_REQUEST
 *               data: null
 *       401:
 *         description: Bearer token مطلوب أو غير صالح
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               status_code: 401
 *               message: Unauthorized
 *               error: UNAUTHORIZED
 *               data: null
 *       403:
 *         description: لا يملك صلاحية DOCUMENT_VERIFY_BY_CODE
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               status_code: 403
 *               message: Forbidden - missing permission
 *               error: FORBIDDEN
 *               data: null
 *       404:
 *         description: المعاملة غير موجودة
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               status_code: 404
 *               message: المعاملة غير موجودة
 *               error: NOT_FOUND
 *               data: null
 */
router.get(
  '/document/details/by-transaction',
  authMiddleware,
  authorize('DOCUMENT_VERIFY_BY_CODE'),
  getDocumentVerifyDetailsByTransactionController
)

module.exports = router
