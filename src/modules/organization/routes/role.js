const express = require('express')
const router = express.Router()

const {
  createRole,
  updateRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRolesByDepartment
} = require('../controllers/RoleController')

const { authMiddleware, authorize } = require('../../../core/middleware/authMiddleware')


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
  authorize('ROLE_CREATE'),
  createRole
)

/**
 * @swagger
 * /api/role/{id}:
 *   put:
 *     summary: تعديل سجل ربط الدور (organization_department_roles.id)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleUpdate'
 *     responses:
 *       200:
 *         description: updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleEnvelope'
 */
router.put(
  '/:id',
  authMiddleware,
  authorize('ROLE_UPDATE'),
  updateRole
)

/**
 * @swagger
 * /api/role/{id}:
 *   delete:
 *     summary: حذف سجل ربط الدور (لا يحذف الدور الأصلي من جدول roles)
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
 *         description: deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleDeleteEnvelope'
 */
router.delete(
  '/:id',
  authMiddleware,
  authorize('ROLE_DELETE'),
  deleteRole
)

/**
 * @swagger
 * /api/role:
 *   get:
 *     summary: جلب كل سجلات ربط الأدوار
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleListEnvelope'
 */
router.get(
  '/',
  authMiddleware,
  authorize('ROLE_VIEW'),
  getAllRoles
)

/**
 * @swagger
 * /api/role/by-department/{departmentId}:
 *   get:
 *     summary: جلب الأدوار المتاحة لقسم محدد
 *     description: يعيد كل الأدوار المرتبطة بالقسم (للـ leaf department)، تستخدم عند تسجيل موظف بعد اختيار القسم
 *     tags: [Role]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: roles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RolesByDepartmentEnvelope'
 */
router.get(
  '/by-department/:departmentId',
  authMiddleware,
  authorize('ROLE_VIEW'),
  getRolesByDepartment
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
  authorize('ROLE_VIEW'),
  getRoleById
)

module.exports = router
