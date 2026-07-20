'use strict'

const express = require('express')
const router = express.Router()

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const {
  verifyDocumentController,
  getDocumentVerifyDetailsController
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
 *         schema: { type: string, pattern: '^\\d{6}$' }
 *         description: رمز التحقق من QR (6 أرقام)
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
router.get('/document/details', authMiddleware, getDocumentVerifyDetailsController)

module.exports = router
