'use strict'

const express = require('express')
const router = express.Router()

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')
const {
  uploadTransactionFile,
  runMulterUpload
} = require('../../../../core/middleware/upload')
const {
  uploadFileLimiter
} = require('../../../../core/security/rateLimitMiddleware')
const {
  uploadTransactionFileController
} = require('../controllers/documentUploadController')

/**
 * @swagger
 * /api/transaction/files/upload:
 *   post:
 *     summary: Upload transaction attachment
 *     description: |
 *       **الخطوة 1** قبل `POST /api/transaction/updateDraft/{processId}` ثم `POST /api/transaction/submit/{transactionId}` أو `POST /api/workflow/tasks/{taskId}/complete`.
 *
 *       يرفع الملف إلى `uploads/` ويرجع `path` و `type_doc_id` لإدراجها في `files[]`:
 *       ```json
 *       { "key": "national_id_files", "path": "/uploads/....pdf", "type_doc_id": 1 }
 *       ```
 *
 *       **multipart fields:**
 *       - `file` (required) — الملف
 *       - `type_doc_id` (required) — من stage_config → file_picker.data.type_doc_id
 *       - `key` (required) — معرّف file_picker (data.id) مثل national_id_files
 *
 *       **Dedup:** نفس الملف (SHA-256) لنفس المستخدم → نفس `path` مع `already_exists: true` (بدون نسخة جديدة على القرص).
 *       **ملف جديد لنفس key:** يُحفظ كملف مستقل — **لا يُحذف** الملف السابق (نفس picker_key قد يُستخدم بمعاملات متعددة).
 *       **Quota:** حد يومي per user (TRANSACTION_UPLOAD_DAILY_MAX_FILES / MAX_MB).
 *       **Rate limit:** uploadFileLimiter (RATE_LIMIT_UPLOAD_MAX / WINDOW_MS).
 *
 *       **حد الحجم:** TRANSACTION_FILE_MAX_MB (افتراضي 25MB)
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, type_doc_id, key]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               type_doc_id:
 *                 type: integer
 *                 example: 1
 *               key:
 *                 type: string
 *                 example: national_id_files
 *     responses:
 *       200:
 *         description: تم رفع الملف بنجاح
 *       400:
 *         description: ملف أو type_doc_id غير صالح
 *       429:
 *         description: تجاوز حد الرفع (rate limit أو quota يومي)
 *       401:
 *         description: غير مصرّح
 */
router.post(
  '/upload',
  authMiddleware,
  uploadFileLimiter,
  runMulterUpload(uploadTransactionFile.single('file')),
  uploadTransactionFileController
)

module.exports = router
