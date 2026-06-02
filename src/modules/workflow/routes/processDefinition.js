'use strict'

const express = require('express')
const router = express.Router()

const {
  createProcessDefinition,
  getAuthProcessesController,
  getCitizenAuthProcessesController,
  reviewProcessController,
  getProcessDetails
} = require('../controllers/processDefController')

const {uploadBPMN,
  uploadDocumentTemplate} = require('../../../core/middleware/upload')
const { authMiddleware ,authorize } = require('../../../core/middleware/authMiddleware')


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
 *             type: object
 *             required:
 *               - file
 *               - name
 *               - priority
 *               - start_date
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: BPMN file
 *               name:
 *                 type: string
 *                 example: Leave Process
 *               code:
 *                 type: string
 *                 example: LEAVE_001
 *               is_complaint:
 *                 type: boolean
 *                 default: false
 *                 description: |
 *                   إذا true → type_trans_id يجب أن يكون null (معاملة شكوى)
 *               type_trans_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *                 description: مطلوب فقط عندما is_complaint = false
 *               organization_id:
 *                 type: integer
 *                 example: 10
 *               priority:
 *                 type: integer
 *                 example: 1
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-01-01
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-12-31
 *     responses:
 *       200:
 *         description: تم إنشاء العملية بنجاح.
 *       400:
 *         description: ملف BPMN مطلوب أو خطأ بالبيانات.
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
 *     responses:
 *       200:
 *         description: تم جلب عمليات AUTH بنجاح.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthProcessListResponse'
 *             example:
 *               message: تم جلب عمليات AUTH بنجاح
 *               data:
 *                 - process_id: 1
 *                   name: Leave Request
 *                   code: LEAVE_001
 *                   priority: 1
 *                   auth_stage:
 *                     id: 10
 *                     name: Submit Request
 *                     code: SUBMIT_LEAVE
 *                     type: USER_TASK
 *                     auth_type: AUTH
 *               from_cache: false
 */
router.get(
  '/auth/:id',
  authMiddleware,
  getAuthProcessesController
)

/**
 * @swagger
 * /api/process_definitions/citizen/type/{typeTransId}:
 *   get:
 *     summary: Get citizen processes by type (cached)
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: typeTransId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: تم جلب عمليات AUTH بنجاح.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthProcessListResponse'
 *             example:
 *               message: تم جلب عمليات AUTH بنجاح
 *               data:
 *                 - process_id: 3
 *                   name: Certificate Request
 *                   code: CERT_001
 *                   priority: 2
 *                   auth_stage:
 *                     id: 12
 *                     name: Citizen Submit
 *                     code: CITIZEN_SUBMIT
 *                     type: USER_TASK
 *                     auth_type: AUTH
 *               from_cache: true
 */
router.get(
  '/citizen/type/:typeTransId',
  authMiddleware,
  getCitizenAuthProcessesController
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