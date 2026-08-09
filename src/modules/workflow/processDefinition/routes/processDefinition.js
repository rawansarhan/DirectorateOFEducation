'use strict'

const express = require('express')
const router = express.Router()

const {
  createProcessDefinition,
  getAuthProcessesController,
  getUnapprovedOrInactiveProcessesController,
  getProcessesWithMissingStageConfigController,
  getProcessesByTypeController,
  getProcessesByTypeForAdminController,
  updateProcessActiveStatusController,
  getComplaintProcessesForAdminController,
  getAllComplaintProcessesForAdminController,
  getProcessDetails,
  reviewProcessController,
  processById,
  getAllProcessDefinitionStatsController
} = require('../controllers/processDefController')

const {uploadBPMN,
  uploadDocumentTemplate,
  runMulterUpload} = require('../../../../core/middleware/upload')
const { authMiddleware ,authorize } = require('../../../../core/middleware/authMiddleware')

// يجب قبل مسارات /:id
router.use(require('./searchProcesses'))

/**
 * @swagger
 * /api/process_definitions/create:
 *   post:
 *     summary: Create new process definition (upload BPMN) =.(المسؤول التقني)
 *     description: |
 *       عند `is_complaint=true` يُرفض الإنشاء إذا وُجدت شكوى أخرى نشطة
 *       (`is_complaint=true` و `is_active=true`). يُسمح بإنشاء شكوى جديدة فقط
 *       بعد تعطيل كل الشكاوى السابقة (`is_active=false`).
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
  authorize('PROCESS_PUBLISH_MANAGE'),
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
  authorize('PROCESS_PUBLISH_MANAGE'),
  getUnapprovedOrInactiveProcessesController
)

/**
 * @swagger
 * /api/process_definitions/stats:
 *   get:
 *     summary: إحصائيات العمليات الموافق عليها مع عدد المعاملات والدوائر المرتبطة
 *     description: |
 *       يعرض **فقط** process definitions بحالة `approval_status = APPROVED`،
 *       ويستبعد العمليات التي لا تحتوي خلال الفترة المحددة أي معاملة
 *       بحالة: pending_pickup, in_progress, completed, أو rejected.
 *
 *       لكل عملية معروضة:
 *       - اسم نوع المعاملة (type_trans.name)
 *       - process code
 *       - عدد المعاملات حسب الحالة: pending_pickup, in_progress, completed, rejected
 *       - الدوائر المرتبطة عبر stage_assignments → organization_department_roles → department
 *
 *       فلترة بتاريخ إنشاء المعاملة: from_date / to_date
 *       الكاش: قائمة العمليات الموافق عليها + الدوائر (ثابتة)؛ أعداد المعاملات تُحسب طازجة كل طلب.
 *     tags: [Process Definition]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date, example: '2026-01-01' }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date, example: '2026-01-31' }
 *     responses:
 *       200:
 *         description: تم جلب الإحصائيات بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProcessDefinitionStatsEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب إحصائيات العمليات بنجاح
 *               data:
 *                 items:
 *                   - process_definition_id: 5
 *                     process_name: طلب إجازة سنوية
 *                     process_code: LEAVE_ANNUAL_V1
 *                     transaction_type_name: إجازة
 *                     transaction_type_code: LEAVE
 *                     is_active: true
 *                     approval_status: APPROVED
 *                     transactions:
 *                       pending_pickup: 4
 *                       in_progress: 12
 *                       completed: 156
 *                       rejected: 3
 *                     departments:
 *                       - id: 7
 *                         name: شعبة الموارد البشرية
 *                       - id: 3
 *                         name: دائرة الشؤون الإدارية
 *                   - process_definition_id: 8
 *                     process_name: طلب شهادة حسن سيرة
 *                     process_code: GOOD_CONDUCT_V2
 *                     transaction_type_name: شهادة
 *                     transaction_type_code: CERTIFICATE
 *                     is_active: true
 *                     approval_status: APPROVED
 *                     transactions:
 *                       pending_pickup: 0
 *                       in_progress: 5
 *                       completed: 89
 *                       rejected: 1
 *                     departments:
 *                       - id: 15
 *                         name: دائرة المالية
 *                       - id: 8
 *                         name: شعبة الأرشيف
 *                 period:
 *                   from_date: '2026-01-01'
 *                   to_date: '2026-01-31'
 *       400:
 *         description: تواريخ غير صالحة
 *       403:
 *         description: PROCESS_VIEW_STATS مطلوب
 */
router.get(
  '/stats',
  authMiddleware,
  authorize('PROCESS_VIEW_STATS'),
  getAllProcessDefinitionStatsController
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
  authorize('PROCESS_PUBLISH_MANAGE'),
  getProcessesWithMissingStageConfigController
)
/**
 * @swagger
 * /api/process_definitions/type/{id}:
 *   get:
 *     summary: كل عمليات نوع معاملة (النشطة فقط)
 *     description: |
 *       يعرض عمليات النوع حيث `is_active = true` فقط.
 *       id = type_trans_id. أرسل 0 لجلب كل الأنواع (ما عدا الشكاوى).
 *
 *       **Auth:** Bearer + صلاحية `GET_ORGANIZATIONAL_STRUCTURE`
 *       مع Redis cache (TTL = PROCESS_CACHE_TTL_SECONDS).
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
 *       400:
 *         description: نوع المعاملة غير موجود
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/type/:id',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE'),
  getProcessesByTypeController
)

/**
 * @swagger
 * /api/process_definitions/admin/type/{id}:
 *   get:
 *     summary: كل عمليات نوع معاملة المعتمدة (للإدارة)
 *     description: |
 *       يعرض **كل** عمليات النوع المعتمدة (`approval_status = APPROVED` / `is_approved = true`)
 *       سواء كانت `is_active = true` أو `is_active = false`.
 *
 *       - لا يعرض غير المعتمدة (PENDING / REJECTED).
 *       - id = type_trans_id. أرسل 0 لجلب كل الأنواع (ما عدا الشكاوى).
 *
 *       **Auth:** Bearer + صلاحية `PROCESS_PUBLISH_MANAGE`
 *       مع Redis cache مستقل عن `/type/{id}` (TTL = PROCESS_CACHE_TTL_SECONDS).
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
 *         description: تم الجلب بنجاح — عمليات معتمدة فقط مع حقل is_active لكل عملية
 *       400:
 *         description: نوع المعاملة غير موجود
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: PROCESS_PUBLISH_MANAGE مطلوب
 */
router.get(
  '/admin/type/:id',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  getProcessesByTypeForAdminController
)

/**
 * @swagger
 * /api/process_definitions/admin/{id}/status:
 *   patch:
 *     summary: تعديل حالة العملية (نشط/غير نشط) لكل الأنواع
 *     description: |
 *       يبدّل `is_active` للعملية المحددة سواء كانت:
 *       - `is_complaint = false` (معاملة عادية)
 *       - `is_complaint = true` (عملية شكوى)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_active]
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: تم تعديل حالة العملية بنجاح
 *       400:
 *         description: بيانات غير صالحة
 *       401:
 *         description: Unauthorized
 */
router.patch(
  '/admin/:id/status',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  updateProcessActiveStatusController
)

/**
 * @swagger
 * /api/process_definitions/admin/complaints:
 *   get:
 *     summary: عمليات الشكاوى النشطة فقط (is_complaint=true, is_active=true)
 *     description: |
 *       يعرض تعريفات عمليات الشكاوى **النشطة فقط** حيث `is_complaint = true` و `is_active = true`.
 *       مع Redis cache (TTL = PROCESS_CACHE_TTL_SECONDS).
 *
 *       **Auth:** Bearer (تسجيل دخول فقط — بدون تقييد دور)
 *     tags: [Complaint]
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
 *         description: تم جلب عمليات الشكاوى بنجاح
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب عمليات الشكاوى النشطة بنجاح
 *               data:
 *                 items:
 *                   - process_id: 10
 *                     name: شكوى خدمة
 *                     code: COMP-01
 *                     priority: 1
 *                     deployment_status: deployed
 *                     approval_status: APPROVED
 *                     is_active: true
 *                     is_complaint: true
 *                 pagination:
 *                   page: 1
 *                   limit: 20
 *                   total: 1
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/admin/complaints',
  authMiddleware,
  getComplaintProcessesForAdminController
)

/**
 * @swagger
 * /api/process_definitions/admin/complaints/all:
 *   get:
 *     summary: كل عمليات الشكاوى (نشطة + غير نشطة)
 *     description: |
 *       يعرض كل تعريفات عمليات الشكاوى حيث `is_complaint = true`
 *       بما فيها `is_active = true` و `is_active = false`.
 *       مع Redis cache (TTL = PROCESS_CACHE_TTL_SECONDS).
 *
 *       **Auth:** Bearer (تسجيل دخول فقط — بدون تقييد دور)
 *     tags: [Complaint]
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
 *         description: تم جلب كل عمليات الشكاوى بنجاح
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/admin/complaints/all',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  getAllComplaintProcessesForAdminController
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
 *     description: |
 *       يجلب تفاصيل العملية الكاملة مع التحقق (validation)، بما فيها assignments
 *       مع organization.name و department.name و role.name لكل OrgDepRole.
 *
 *       **Redis cache:** مفتاح `process:details:{id}` — TTL = API_CACHE_TTL_SECONDS.
 *       يُبطَّل عند تعديل stage_config أو assignments أو مراجعة العملية (approve/reject).
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
 *                             description: |
 *                               لكل organization_department_role: organization.name، department.name، role.name
 *                             items:
 *                               type: object
 *                               properties:
 *                                 organization_department_roles_id:
 *                                   type: integer
 *                                   example: 12
 *                                 role:
 *                                   type: object
 *                                   nullable: true
 *                                   properties:
 *                                     id:
 *                                       type: integer
 *                                       example: 12
 *                                     name:
 *                                       type: string
 *                                       example: موظف معاملات
 *                                     is_active:
 *                                       type: boolean
 *                                       example: true
 *                                     organization:
 *                                       type: object
 *                                       nullable: true
 *                                       properties:
 *                                         name:
 *                                           type: string
 *                                           example: مديرية التربية
 *                                     department:
 *                                       type: object
 *                                       nullable: true
 *                                       properties:
 *                                         name:
 *                                           type: string
 *                                           example: دائرة الشؤون الإدارية
 *                     validation:
 *                       type: object
 *                       properties:
 *                         is_valid:
 *                           type: boolean
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب تفاصيل العملية بنجاح
 *               data:
 *                 process:
 *                   id: 1
 *                   name: طلب إجازة سنوية
 *                   code: LEAVE_ANNUAL_V1
 *                   status: DEPLOYED
 *                   version: 1
 *                   is_active: true
 *                   approval_status: APPROVED
 *                   is_approved: true
 *                   start_date: '2026-01-01T00:00:00.000Z'
 *                   end_date: null
 *                 stages:
 *                   - id: 10
 *                     name: تقديم الطلب
 *                     code: SUBMIT
 *                     type: AUTH
 *                     auth_type: CITIZEN
 *                     has_config: true
 *                     config: {}
 *                     has_assignments: true
 *                     assignments:
 *                       - organization_department_roles_id: 12
 *                         role:
 *                           id: 12
 *                           name: موظف معاملات
 *                           is_active: true
 *                           organization:
 *                             name: مديرية التربية
 *                           department:
 *                             name: دائرة الشؤون الإدارية
 *                 validation:
 *                   is_valid: true
 *                   errors: []
 *       404:
 *         description: العملية غير موجودة
 */
router.get(
  '/:id/details',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE'),
  getProcessDetails
)
 /**
 * @swagger
 * /api/process_definitions/admin/{id}/details:
 *   get:
 *     summary: Get full process details with validation => ( المسؤول التقني)
 *     description: |
 *       يجلب تفاصيل العملية الكاملة مع التحقق (validation)، بما فيها assignments
 *       مع organization.name و department.name و role.name لكل OrgDepRole.
 *
 *       **Redis cache:** مفتاح `process:details:{id}` — TTL = API_CACHE_TTL_SECONDS.
 *       يُبطَّل عند تعديل stage_config أو assignments أو مراجعة العملية (approve/reject).
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
 *                             description: |
 *                               لكل organization_department_role: organization.name، department.name، role.name
 *                             items:
 *                               type: object
 *                               properties:
 *                                 organization_department_roles_id:
 *                                   type: integer
 *                                   example: 12
 *                                 role:
 *                                   type: object
 *                                   nullable: true
 *                                   properties:
 *                                     id:
 *                                       type: integer
 *                                       example: 12
 *                                     name:
 *                                       type: string
 *                                       example: موظف معاملات
 *                                     is_active:
 *                                       type: boolean
 *                                       example: true
 *                                     organization:
 *                                       type: object
 *                                       nullable: true
 *                                       properties:
 *                                         name:
 *                                           type: string
 *                                           example: مديرية التربية
 *                                     department:
 *                                       type: object
 *                                       nullable: true
 *                                       properties:
 *                                         name:
 *                                           type: string
 *                                           example: دائرة الشؤون الإدارية
 *                     validation:
 *                       type: object
 *                       properties:
 *                         is_valid:
 *                           type: boolean
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب تفاصيل العملية بنجاح
 *               data:
 *                 process:
 *                   id: 1
 *                   name: طلب إجازة سنوية
 *                   code: LEAVE_ANNUAL_V1
 *                   status: DEPLOYED
 *                   version: 1
 *                   is_active: true
 *                   approval_status: APPROVED
 *                   is_approved: true
 *                   start_date: '2026-01-01T00:00:00.000Z'
 *                   end_date: null
 *                 stages:
 *                   - id: 10
 *                     name: تقديم الطلب
 *                     code: SUBMIT
 *                     type: AUTH
 *                     auth_type: CITIZEN
 *                     has_config: true
 *                     config: {}
 *                     has_assignments: true
 *                     assignments:
 *                       - organization_department_roles_id: 12
 *                         role:
 *                           id: 12
 *                           name: موظف معاملات
 *                           is_active: true
 *                           organization:
 *                             name: مديرية التربية
 *                           department:
 *                             name: دائرة الشؤون الإدارية
 *                 validation:
 *                   is_valid: true
 *                   errors: []
 *       404:
 *         description: العملية غير موجودة
 */
 router.get(
  '/admin/:id/details',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
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
 *     description: |
 *       - `APPROVE`: يعتمد العملية ويضبط `is_active` حسب جدول التواريخ.
 *       - `REJECT`: يحذف العملية نهائياً (force delete) من `process_definitions`
 *         مع CASCADE للمراحل/الإعدادات، ويحاول حذف نشر Camunda إن وُجد.
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
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: تم تنفيذ المراجعة بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: تم رفض العملية وحذفها نهائياً
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *                     process_definition_id:
 *                       type: integer
 *                       example: 1
 *             examples:
 *               approve:
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم تنفيذ المراجعة بنجاح
 *                   data:
 *                     message: تمت الموافقة على العملية
 *                     deleted: false
 *                     process_definition_id: 1
 *               reject:
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم تنفيذ المراجعة بنجاح
 *                   data:
 *                     message: تم رفض العملية وحذفها نهائياً
 *                     deleted: true
 *                     process_definition_id: 1
 *       400:
 *         description: قرار غير صالح أو العملية غير مكتملة
 *       404:
 *         description: العملية غير موجودة
 */
router.post(
  '/:id/review',
  authMiddleware,
  authorize('PROCESS_REVIEW'),
  reviewProcessController
)

module.exports = router