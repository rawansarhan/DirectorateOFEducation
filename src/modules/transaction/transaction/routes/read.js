'use strict'

const express = require('express')
const router = express.Router()

const {
  getTransactionController,
  getFirstStageContentController
} = require('../controllers/transactionController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/transaction/{transactionId}/first-stage:
 *   get:
 *     summary: عرض طلب مقدم الطلب (مرحلة AUTH الأولى)
 *     description: |
 *       يعرض محتوى مرحلة التقديم (AUTH) كما سُجّل في transaction.data.
 *       يُرجع البيانات فقط إذا completed_by يساوي user_id المستخدم من التوكن.
 *       للمالك فقط (transaction.user_id).
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
 *         description: تم جلب محتوى المرحلة الأولى
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionFirstStageEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب محتوى المرحلة الأولى بنجاح
 *               data:
 *                 transaction_id: 42
 *                 stage_code: Activity_0wvfirz
 *                 stage_name: تقديم الطلب
 *                 auth_type: AUTH
 *                 completed_by: 3
 *                 content:
 *                   stage_name: تقديم الطلب
 *                   form_id: leave_process_auth
 *                   form_name: الوثائق المطلوبة للمواطن
 *                   decision: null
 *                   note: ''
 *                   rejection_reason: null
 *                   completed_by: 3
 *                   completed_at: 15/01/2026
 *                   widgets:
 *                     - widget_type: text_field
 *                       data:
 *                         id: student_first_name
 *                         label: اسم الطالب
 *                         is_required: true
 *                       value: روان
 *                     - widget_type: text_field
 *                       data:
 *                         id: student_father_name
 *                         label: اسم الأب
 *                         is_required: true
 *                       value: أحمد
 *                     - widget_type: file_picker
 *                       data:
 *                         id: birth_certificate
 *                         label: شهادة الميلاد
 *                         is_required: true
 *                       value:
 *                         - path: /uploads/1779540194357-birth-cert.pdf
 *                           url: http://localhost:4000/uploads/1779540194357-birth-cert.pdf
 *                   templates:
 *                     - id_template: 1
 *                       id_document_instance: 55
 *                       generated_pdf_path: /uploads/final/tx-42-template.pdf
 *                       generated_pdf_url: http://localhost:4000/uploads/final/tx-42-template.pdf
 *                       value:
 *                         student_name: روان
 *                         father_name: أحمد
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: المعاملة ليست ملك المستخدم المصادق
 *       404:
 *         description: المعاملة غير موجودة أو لا يوجد طلب مقدّم محفوظ
 */
router.get(
  '/:transactionId/first-stage',
  authMiddleware,
  getFirstStageContentController
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
