'use strict'

const express = require('express')
const router = express.Router()

const {
  listPermissionsController,
  listEmployeePermissionsController,
  listAdminPermissionsController,
  getRolePermissionsController,
  createRolePermissionsController,
  updateRolePermissionsController
} = require('../controllers/permissionRoleController')

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: الصلاحيات وربطها بالأدوار
 */

/**
 * @swagger
 * /api/auth/permissions:
 *   get:
 *     tags: [Permissions]
 *     summary: عرض كل الصلاحيات (permissions)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة الصلاحيات
 *       401:
 *         description: غير مصرح
 *       403:
 *         description: لا يملك صلاحية PERMISSION_MANAGE
 */
router.get(
  '/permissions',
  authMiddleware,
  authorize('PERMISSION_MANAGE'),
  listPermissionsController
)

/**
 * @swagger
 * /api/auth/permissions/employee:
 *   get:
 *     tags: [Permissions]
 *     summary: صلاحيات الموظف (وما يشترك فيه المواطن/الموظف/الإدارة)
 *     description: |
 *       يعرض الصلاحيات حيث:
 *       - `type = employee`
 *       - أو `type = employee,citizen,admin`
 *
 *       مع Redis cache (`auth:permissions:audience:employee`).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة صلاحيات الموظف
 *       401:
 *         description: غير مصرح
 *       403:
 *         description: لا يملك صلاحية PERMISSION_MANAGE
 */
router.get(
  '/permissions/employee',
  authMiddleware,
  authorize('PERMISSION_MANAGE'),
  listEmployeePermissionsController
)

/**
 * @swagger
 * /api/auth/permissions/admin:
 *   get:
 *     tags: [Permissions]
 *     summary: صلاحيات الإدارة (وما يشترك فيه المواطن/الموظف/الإدارة)
 *     description: |
 *       يعرض الصلاحيات حيث:
 *       - `type = admin`
 *       - أو `type = employee,citizen,admin`
 *
 *       مع Redis cache (`auth:permissions:audience:admin`).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة صلاحيات الإدارة
 *       401:
 *         description: غير مصرح
 *       403:
 *         description: لا يملك صلاحية PERMISSION_MANAGE
 */
router.get(
  '/permissions/admin',
  authMiddleware,
  authorize('PERMISSION_MANAGE'),
  listAdminPermissionsController
)

/**
 * @swagger
 * /api/auth/role-permissions:
 *   get:
 *     tags: [Permissions]
 *     summary: عرض صلاحيات دور ضمن مؤسسة/قسم
 *     description: |
 *       يبحث عن organization_department_roles المطابق لـ
 *       (organization_id, department_id, role_id) ثم يعرض صلاحياته.
 *
 *       القيم `0` أو `null` أو فارغة تُعامل كـ `null` لأي من الحقول الثلاثة.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         description: 0 أو null أو فارغ = null
 *       - in: query
 *         name: department_id
 *         required: true
 *         schema:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         description: 0 أو null أو فارغ = null
 *       - in: query
 *         name: role_id
 *         required: true
 *         schema:
 *           type: integer
 *           nullable: true
 *           example: 3
 *         description: 0 أو null أو فارغ = null
 *     responses:
 *       200:
 *         description: صلاحيات الدور
 *       404:
 *         description: لا يوجد organization_department_roles مطابق
 */
router.get(
  '/role-permissions',
  authMiddleware,
  authorize('PERMISSION_MANAGE'),
  getRolePermissionsController
)

/**
 * @swagger
 * /api/auth/role-permissions:
 *   post:
 *     tags: [Permissions]
 *     summary: ربط صلاحيات بدور (إنشاء)
 *     description: |
 *       يضيف مجموعة permission_id لسجل organization_department_roles
 *       المطابق لـ (organization_id, department_id, role_id) بدون حذف الموجود.
 *
 *       القيم `0` أو `null` أو فارغة تُعامل كـ `null` لأي من الحقول الثلاثة.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *               - department_id
 *               - role_id
 *               - permission_id
 *             properties:
 *               organization_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: 0 أو null أو فارغ = null
 *               department_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *                 description: 0 أو null أو فارغ = null
 *               role_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *                 description: 0 أو null أو فارغ = null
 *               permission_id:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 5]
 *                 description: مجموعة معرفات الصلاحيات (يقبل أيضاً permission_ids)
 *     responses:
 *       201:
 *         description: تم الربط
 *       400:
 *         description: بيانات غير صحيحة
 *       404:
 *         description: لا يوجد organization_department_roles مطابق
 */
router.post(
  '/role-permissions',
  authMiddleware,
  authorize('PERMISSION_MANAGE'),
  createRolePermissionsController
)

/**
 * @swagger
 * /api/auth/role-permissions:
 *   put:
 *     tags: [Permissions]
 *     summary: تعديل صلاحيات دور (استبدال كامل)
 *     description: |
 *       يستبدل كل صلاحيات organization_department_roles المطابق
 *       بمجموعة permission_id (يمكن أن تكون فارغة لمسح الصلاحيات).
 *
 *       القيم `0` أو `null` أو فارغة تُعامل كـ `null` لأي من الحقول الثلاثة.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *               - department_id
 *               - role_id
 *               - permission_id
 *             properties:
 *               organization_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *                 description: 0 أو null أو فارغ = null
 *               department_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *                 description: 0 أو null أو فارغ = null
 *               role_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 3
 *                 description: 0 أو null أو فارغ = null
 *               permission_id:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 5]
 *                 description: مجموعة معرفات الصلاحيات (يقبل أيضاً permission_ids)
 *     responses:
 *       200:
 *         description: تم التحديث
 *       400:
 *         description: بيانات غير صحيحة
 *       404:
 *         description: لا يوجد organization_department_roles مطابق
 */
router.put(
  '/role-permissions',
  authMiddleware,
  authorize('PERMISSION_MANAGE'),
  updateRolePermissionsController
)

module.exports = router
