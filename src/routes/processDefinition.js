const express = require('express')
const router = express.Router()

const { createProcessDefinition  , deployProcessDefinition , startProcessInstance} = require('../controllers/ProcessDefinition')

/**
 * @swagger
 * /process-definitions:
 *   post:
 *     summary: إنشاء تعريف معاملة جديد
 *     tags: [ProcessDefinition]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProcessDefinitionCreate'
 *     responses:
 *       201:
 *         description: تم إنشاء تعريف المعاملة بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessDefinitionEnvelope'
 *       400:
 *         description: خطأ في البيانات المدخلة
 */
router.post('/process-definitions', createProcessDefinition)

router.post('/process-definitions/:id/deploy', deployProcessDefinition)

router.post('/process-instances/start', startProcessInstance)

module.exports = router