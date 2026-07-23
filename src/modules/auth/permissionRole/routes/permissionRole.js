'use strict'

const express = require('express')
const router = express.Router()

const {
  listPermissionsController,
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
 *         description: لا يملك صلاحية PERMISSION_READ
 */
router.get(
  '/permissions',
  authMiddleware,
  authorize('PERMISSION_READ'),
  listPermissionsController
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
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: department_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 2
 *       - in: query
 *         name: role_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 3
 *     responses:
 *       200:
 *         description: صلاحيات الدور
 *       404:
 *         description: لا يوجد organization_department_roles مطابق
 */
router.get(
  '/role-permissions',
  authMiddleware,
  authorize('ROLE_PERMISSION_READ'),
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
 *                 example: 1
 *               department_id:
 *                 type: integer
 *                 example: 2
 *               role_id:
 *                 type: integer
 *                 example: 3
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
  authorize('ROLE_PERMISSION_CREATE'),
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
 *                 example: 1
 *               department_id:
 *                 type: integer
 *                 example: 2
 *               role_id:
 *                 type: integer
 *                 example: 3
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
  authorize('ROLE_PERMISSION_UPDATE'),
  updateRolePermissionsController
)

module.exports = router
