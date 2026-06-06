'use strict'

const express = require('express')
const router = express.Router()

const {
  createProcessDefinition,
  getAuthProcessesController,
  reviewProcessController,
  getProcessDetails,
  processById
} = require('../controllers/processDefController')

const {uploadBPMN,
  uploadDocumentTemplate} = require('../../../../core/middleware/upload')
const { authMiddleware ,authorize } = require('../../../../core/middleware/authMiddleware')


/**
 * @swagger
 * /api/process_definitions/create:
 *   post:
 *     summary: Create new process definition (upload BPMN) =.(المسؤول التقني)
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ProcessDefinitionCreateForm'
 *     responses:
 *       200:
 *         description: تم إنشاء العملية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessDefinitionCreateSuccessResponse'
 *       400:
 *         description: ملف BPMN مطلوب أو خطأ بالبيانات
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: Forbidden — PROCESS_CREATE permission required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post(
  '/create',
  authMiddleware,
  authorize('PROCESS_CREATE'),
  uploadBPMN.single('file'),
  createProcessDefinition
)

/**
 * @swagger
 * /api/process_definitions/auth/{id}:
 *   get:
 *     summary: Get processes where first stage is AUTH => (عند مواطن او موظف )
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: type Process ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: رقم الصفحة (يبدأ من 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 70
 *           default: 3
 *         description: عدد العناصر في الصفحة
 *     responses:
 *       200:
 *         description: تم جلب عمليات AUTH بنجاح.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: تم جلب عمليات AUTH بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           process_id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                           priority:
 *                             type: integer
 *                           auth_stage:
 *                             type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 3
 *                         total:
 *                           type: integer
 *                           example: 12
 *                         total_pages:
 *                           type: integer
 *                           example: 4
 *                         has_next:
 *                           type: boolean
 *                           example: true
 *                         has_prev:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: خطأ في معاملات page أو limit
 */
router.get(
  '/auth/:id',
  authMiddleware,
  getAuthProcessesController
)

// =========================================
// GET DETAILS + VALIDATION
// =========================================
 /**
 * @swagger
 * /api/process_definitions/{id}/details:
 *   get:
 *     summary: Get full process details with validation => ( المسؤول التقني)
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: Process ID
 *     responses:
 *       200:
 *         description: تم جلب تفاصيل العملية بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: تم جلب تفاصيل العملية بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     process:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                         status:
 *                           type: string
 *                         version:
 *                           type: integer
 *                         is_active:
 *                           type: boolean
 *                         is_approved:
 *                           type: boolean
 *                         start_date:
 *                           type: string
 *                           format: date-time
 *                         end_date:
 *                           type: string
 *                           format: date-time
 *                     stages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           auth_type:
 *                             type: string
 *                           config:
 *                             type: object
 *                           assignments:
 *                             type: array
 *                             items:
 *                               type: object
 *                     validation:
 *                       type: object
 *                       properties:
 *                         is_valid:
 *                           type: boolean
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *       404:
 *         description: العملية غير موجودة
 */
router.get(
  '/:id/details',
  authMiddleware,
  authorize('PROCESS_VIEW'),
  getProcessDetails
)

// =========================================
// APPROVE / REJECT
// =========================================
 /**
 * @swagger
 * /api/process_definitions/{id}/review:
 *   post:
 *     summary: Approve or reject a process => (المسؤول التقني)
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: Process ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *                 example: APPROVE
 *     responses:
 *       200:
 *         description: تم تنفيذ القرار بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: تمت الموافقة على العملية
 *       400:
 *         description: قرار غير صالح أو العملية غير مكتملة
 *       404:
 *         description: العملية غير موجودة
 */
router.post(
  '/:id/review',
  authMiddleware,
  authorize('PROCESS_APPROVE'), // أو permission مناسب
  reviewProcessController
)

module.exports = router