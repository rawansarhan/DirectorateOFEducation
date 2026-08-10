const express = require('express')
const router = express.Router()

const {
  createRole,
  updateRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRolesByDepartment,
  toggleRoleStatus
} = require('../controllers/RoleController')

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')


/**
 * @swagger
 * /api/role:
 *   post:
 *     summary: إنشاء دور جديد وربطه بمؤسسة وقسم
 *     description: |
 *       ينشئ سجل في جدول roles (إذا لم يكن موجوداً بنفس code)،
 *       ثم ينشئ سجل ربط في organization_department_roles.
 *       يولّد camunda_group_key تلقائياً بصيغة CODE__ORG{X}__DEPT{Y}.
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleCreate'
 *     responses:
 *       201:
 *         description: created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleEnvelope'
 */
router.post(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  createRole
)

// /**
//  * @swagger
//  * /api/role/{id}:
//  *   put:
//  *     summary: تعديل سجل ربط الدور (organization_department_roles.id)
//  *     tags: [Role]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: معرّف سجل organization_department_roles
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/RoleUpdate'
//  *     responses:
//  *       200:
//  *         description: updated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/RoleEnvelope'
//  */
// router.put(
//   '/:id',
//   authMiddleware,
//   authorize('ROLE_UPDATE'),
//   updateRole
// )

// /**
//  * @swagger
//  * /api/role/{id}:
//  *   delete:
//  *     summary: حذف سجل ربط الدور (لا يحذف الدور الأصلي من جدول roles)
//  *     tags: [Role]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: معرّف سجل organization_department_roles
//  *     responses:
//  *       200:
//  *         description: deleted
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/RoleDeleteEnvelope'
//  */
// router.delete(
//   '/:id',
//   authMiddleware,
//   authorize('ROLE_DELETE'),
//   deleteRole
// )

/**
 * @swagger
 * /api/role:
 *   get:
 *     summary: جلب سجلات ربط الأدوار لمؤسسة محددة
 *     description: |
 *       يعيد نفس شكل قائمة `organization_department_roles` مع العلاقات
 *       (role / organization / department / parent)،
 *       لكن فقط للسجلات حيث `organization_id` يساوي القيمة المرسلة.
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *         description: معرّف المؤسسة — إلزامي
 *     responses:
 *       200:
 *         description: list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleListEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب البيانات بنجاح
 *               data:
 *                 - id: 12
 *                   role_id: 2
 *                   organization_id: 1
 *                   department_id: 5
 *                   parent_id: null
 *                   is_active: true
 *                   camunda_group_key: ACCOUNTING_MANAGER__ORG1__DEPT5
 *                   role:
 *                     id: 2
 *                     name: مدير المحاسبة
 *                     code: ACCOUNTING_MANAGER
 *                   organization:
 *                     id: 1
 *                     name: مديرية التربية
 *                   department:
 *                     id: 5
 *                     name: قسم المحاسبة
 *                   parent: null
 *       400:
 *         description: organization_id مفقود أو غير صالح
 */
router.get(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getAllRoles
)

/**
 * @swagger
 * /api/role/by-department/{departmentId}:
 *   get:
 *     summary: جلب الأدوار المتاحة لقسم محدد
 *     description: |
 *       يعيد كل الأدوار المرتبطة بالقسم (للـ leaf department)، تُستخدم عند تسجيل موظف بعد اختيار القسم.
 *       الحقول `organization_id` (من سياق المؤسسة) و `role_id` و `department_id`
 *       تُمرَّر لـ `GET /api/employees/by-org-dept-role`.
 *
 *       **هذا الـ API يدعم Caching + Retry limit:**
 *       - **Caching:** Redis key = `role:by-dept:{departmentId}` — TTL = `API_CACHE_TTL_SECONDS`
 *       - **Retry limit:** `retryWithBackoff` — عدد المحاولات = `RETRY_MAX_ATTEMPTS`
 *
 *       **شكل الاستجابة:** `{ success, status_code, message, data }`
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 3
 *     responses:
 *       200:
 *         description: أدوار القسم
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RolesByDepartmentEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب البيانات بنجاح
 *               data:
 *                 - id: 2
 *                   organization_department_roles_id: 12
 *                   name: مدير المحاسبة
 *                   code: ACCOUNTING_MANAGER
 *                 - id: 4
 *                   organization_department_roles_id: 15
 *                   name: موظف معاملات
 *                   code: TRANSACTION_CLERK
 *       400:
 *         description: معرّف القسم غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: القسم غير موجود
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/by-department/:departmentId',
  authMiddleware,
  authorize('TASK_SIGNING'),
  getRolesByDepartment
)
/**
 * @swagger
 * /api/role/admin/by-department/{departmentId}:
 *   get:
 *     summary: جلب الأدوار المتاحة لقسم محدد
 *     description: |
 *       يعيد كل الأدوار المرتبطة بالقسم (للـ leaf department)، تُستخدم عند تسجيل موظف بعد اختيار القسم.
 *       الحقول `organization_id` (من سياق المؤسسة) و `role_id` و `department_id`
 *       تُمرَّر لـ `GET /api/employees/by-org-dept-role`.
 *
 *       **هذا الـ API يدعم Caching + Retry limit:**
 *       - **Caching:** Redis key = `role:by-dept:{departmentId}` — TTL = `API_CACHE_TTL_SECONDS`
 *       - **Retry limit:** `retryWithBackoff` — عدد المحاولات = `RETRY_MAX_ATTEMPTS`
 *
 *       **شكل الاستجابة:** `{ success, status_code, message, data }`
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 3
 *     responses:
 *       200:
 *         description: أدوار القسم
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RolesByDepartmentEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب البيانات بنجاح
 *               data:
 *                 - id: 2
 *                   organization_department_roles_id: 12
 *                   name: مدير المحاسبة
 *                   code: ACCOUNTING_MANAGER
 *                 - id: 4
 *                   organization_department_roles_id: 15
 *                   name: موظف معاملات
 *                   code: TRANSACTION_CLERK
 *       400:
 *         description: معرّف القسم غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: القسم غير موجود
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/admin/by-department/:departmentId',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getRolesByDepartment
)
/**
 * @swagger
 * /api/role/{id}/toggle-status:
 *   patch:
 *     summary: قلب حالة تفعيل سجل ربط الدور (is_active)
 *     description: يقلب قيمة is_active في organization_department_roles من true إلى false أو العكس.
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: معرّف سجل organization_department_roles
 *     responses:
 *       200:
 *         description: toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleEnvelope'
 */
router.patch(
  '/:id/toggle-status',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  toggleRoleStatus
)

/**
 * @swagger
 * /api/role/{id}:
 *   get:
 *     summary: جلب سجل ربط دور حسب المعرف
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: role assignment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleEnvelope'
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getRoleById
)

module.exports = router
