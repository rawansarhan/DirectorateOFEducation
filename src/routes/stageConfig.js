// routes/stageConfig.routes.js

const express = require('express')
const router = express.Router()

const {
  createStageConfigController
} = require('../controllers/stageConfig.controller')

const auth = require('../middlewares/auth')

/**
 * إنشاء إعداد مرحلة
 */
/**
 * @swagger
 * /stage-config:
 *   post:
 *     summary: إنشاء إعداد مرحلة (Stage Config)
 *     tags: [StageConfig]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StageConfigCreate'
 *     responses:
 *       201:
 *         description: تم إنشاء الإعداد بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StageConfigResponse'
 *       400:
 *         description: خطأ في البيانات
 */
router.post(
  '/stage-config',
  auth,
  createStageConfigController
)

module.exports = router