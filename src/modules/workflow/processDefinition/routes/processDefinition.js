'use strict'

const express = require('express')
const router = express.Router()

const {
  createProcessDefinition,
  getAuthProcessesController,
  getUnapprovedOrInactiveProcessesController,
  getProcessesWithMissingStageConfigController,
  getProcessesByTypeForAdminController,
  getProcessDetails,
  reviewProcessController,
  processById
} = require('../controllers/processDefController')

const {uploadBPMN,
  uploadDocumentTemplate,
  runMulterUpload} = require('../../../../core/middleware/upload')
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
 *         description: |
 *           خطأ في البيانات أو ملف BPMN أو Camunda.
 *           الحقل message يحتوي السبب بالتفصيل، وقد يُرجع data.errors بقائمة الحقول الخاطئة.
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
  runMulterUpload(uploadBPMN.single('file')),
  createProcessDefinition
)

/**
 * @swagger
 * /api/process_definitions/admin/review-queue:
 *   get:
 *     summary: عمليات غير موافق عليها أو غير نشطة => (المسؤول التقني)
 *     description: |
 *       يعرض process definitions حيث:
 *       - `is_approved = false` (approval_status ≠ APPROVED) **أو** `is_active = false`
 *       - **و** جميع مراحل العملية لها `stage_config` (إن وُجدت مرحلة واحدة بدون config تُستبعد)
 *       - **و** يوجد مرحلة واحدة على الأقل
 *
 *       للعمليات التي تحتاج إعداد stage_config: GET /admin/missing-stage-config
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 70
 *           default: 20
 *     responses:
 *       200:
 *         description: تم الجلب بنجاح
 *       403:
 *         description: PROCESS_VIEW مطلوب
 */
router.get(
  '/admin/review-queue',
  authMiddleware,
  authorize('PROCESS_VIEW'),
  getUnapprovedOrInactiveProcessesController
)

/**
 * @swagger
 * /api/process_definitions/admin/missing-stage-config:
 *   get:
 *     summary: عمليات بمراحل بدون stage_config => (المسؤول التقني)
 *     description: |
 *       يعرض process definitions حيث:
 *       - لا توجد مراحل أصلاً، **أو**
 *       - توجد مرحلة واحدة على الأقل بدون `stage_config`
 *
 *       الحقول الإضافية: stages_total_count, stages_missing_config_count
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 70
 *           default: 20
 *     responses:
 *       200:
 *         description: تم الجلب بنجاح
 *       403:
 *         description: PROCESS_VIEW مطلوب
 */
router.get(
  '/admin/missing-stage-config',
  authMiddleware,
  authorize('PROCESS_VIEW'),
  getProcessesWithMissingStageConfigController
)

/**
 * @swagger
 * /api/process_definitions/admin/type/{id}:
 *   get:
 *     summary: كل عمليات نوع معاملة => (المسؤول التقني)
 *     description: |
 *       مثل GET /auth/{id} للمواطن/الموظف، لكن بدون شرط أن تكون أول مرحلة AUTH.
 *       id = type_trans_id. أرسل 0 لجلب كل الأنواع (ما عدا الشكاوى).
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 70
 *           default: 20
 *     responses:
 *       200:
 *         description: تم الجلب بنجاح
 *       403:
 *         description: PROCESS_VIEW مطلوب
 */
router.get(
  '/admin/type/:id',
  authMiddleware,
  authorize('PROCESS_VIEW'),
  getProcessesByTypeForAdminController
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
 *         description: |
 *           type Process ID (type_trans_id).
 *           أرسل 0 لجلب كل عمليات AUTH بغض النظر عن نوع المعاملة.
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