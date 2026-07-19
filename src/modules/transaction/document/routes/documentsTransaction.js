'use strict'

const express = require('express')
const router = express.Router()

const {
  getTransactionDocumentsController
} = require('../controllers/transactionDocumentsController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/transaction/{transactionId}/documents:
 *   get:
 *     summary: كل ملفات المعاملة (GENERATE_PDF + file_picker) + QR النهائي
 *     description: |
 *       يُرجِع لمعاملة واحدة:
 *       - `generated_documents`: كل ملفات GENERATE_PDF (من document_instance) مع content_hash.
 *       - `uploaded_files`: كل ملفات file_picker المرفوعة (من document_signature) مع نوع الوثيقة.
 *       - `final_qr`: رمز QR النهائي للمعاملة وفق الطريقة المعتمدة (توقيع سلطة الإصدار — مؤشّر حيّ لسلسلة التواقيع).
 *
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
 *         description: معرّف المعاملة
 *     responses:
 *       200:
 *         description: تم جلب وثائق المعاملة بنجاح
 *       400:
 *         description: معرّف غير صالح
 *       403:
 *         description: لا تملك صلاحية الوصول
 *       404:
 *         description: المعاملة غير موجودة
 */
router.get(
  '/:transactionId/documents',
  authMiddleware,
  getTransactionDocumentsController
)

module.exports = router
