'use strict'

const express = require('express')
const router = express.Router()

const {
  verifyDocumentController
} = require('../controllers/integrityChainController')

/**
 * @swagger
 * /api/verify/document:
 *   get:
 *     summary: Verify a generated document via its QR code (public)
 *     description: >
 *       نقطة تحقق عامة (بدون مصادقة) تُستدعى عند مسح رمز QR المضمّن في الـ PDF.
 *       تتحقق من توقيع سلطة الإصدار، تطابق المعاملة، وسلامة سلسلة التواقيع،
 *       وتعيد content_hash المسجّل لمطابقته مع الملف الممسوح.
 *     tags: [IntegrityChain]
 *     parameters:
 *       - in: query
 *         name: tx
 *         required: true
 *         schema: { type: integer }
 *         description: معرّف المعاملة
 *       - in: query
 *         name: g
 *         required: true
 *         schema: { type: string }
 *         description: genesis_hash للمعاملة
 *       - in: query
 *         name: doc
 *         required: true
 *         schema: { type: integer }
 *         description: معرّف نسخة الوثيقة (document_instance.id)
 *       - in: query
 *         name: s
 *         required: true
 *         schema: { type: string }
 *         description: توقيع سلطة الإصدار (Ed25519, base64url)
 *     responses:
 *       200:
 *         description: نتيجة التحقق
 *       400:
 *         description: بيانات غير صالحة
 *       404:
 *         description: المعاملة غير موجودة
 */
router.get('/document', verifyDocumentController)

module.exports = router
