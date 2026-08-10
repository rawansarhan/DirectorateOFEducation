const express = require('express')
const router = express.Router()

const {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllDepartments,
  getDepartmentById,
  getDepartmentOverview,
  getLeafDepartmentsByOrganization,
  getAccessibleDepartments,
  toggleDepartmentStatus
} = require('../controllers/DepartmentController')

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')


/**
 * @swagger
 * /api/department:
 *   post:
 *     summary: إنشاء قسم جديد
 *     tags: [Department]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepartmentCreate'
 *     responses:
 *       201:
 *         description: created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentEnvelope'
 */
router.post(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  createDepartment
)

// /**
//  * @swagger
//  * /api/department/{id}:
//  *   put:
//  *     summary: تعديل قسم
//  *     tags: [Department]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/DepartmentUpdate'
//  *     responses:
//  *       200:
//  *         description: updated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/DepartmentEnvelope'
//  */
// router.put(
//   '/:id',
//   authMiddleware,
//   authorize('DEPARTMENT_UPDATE'),
//   updateDepartment
// )

// /**
//  * @swagger
//  * /api/department/{id}:
//  *   delete:
//  *     summary: حذف قسم
//  *     tags: [Department]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *     responses:
//  *       200:
//  *         description: deleted
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/DepartmentDeleteEnvelope'
//  */
// router.delete(
//   '/:id',
//   authMiddleware,
//   authorize('DEPARTMENT_DELETE'),
//   deleteDepartment
// )

/**
 * @swagger
 * /api/department:
 *   get:
 *     summary: جلب كل الأقسام
 *     tags: [Department]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentListEnvelope'
 */
router.get(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getAllDepartments
)

/**
 * @swagger
 * /api/department/accessible-scope:
 *   get:
 *     summary: دوائر نطاق المستخدم (شجرة organization_department_roles + Redis cache)
 *     description: |
 *       يبدأ من organization_department_roles_id في user_role_assignments للمستخدم،
 *       ثم يجمع كل الأبناء والأحفاد عبر parent_id، ويعيد department_id/distinct departments.
 *       النتيجة تُخزَّن في Redis (TTL = API_CACHE_TTL_SECONDS).
 *     tags: [Department]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: نطاق الدوائر المتاحة للمستخدم
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentAccessibleScopeEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب دوائر نطاق المستخدم بنجاح
 *               data:
 *                 root_org_dept_role_ids: [12, 45]
 *                 org_dept_role_ids: [12, 13, 14, 45, 46]
 *                 department_ids: [3, 7, 8, 15]
 *                 departments:
 *                   - id: 3
 *                     name: دائرة الشؤون الإدارية
 *                     organization_id: 1
 *                     parent_id: null
 *                     is_active: true
 *                   - id: 7
 *                     name: شعبة الموارد البشرية
 *                     organization_id: 1
 *                     parent_id: 3
 *                     is_active: true
 *                   - id: 8
 *                     name: شعبة الأرشيف
 *                     organization_id: 1
 *                     parent_id: 3
 *                     is_active: true
 *                   - id: 15
 *                     name: دائرة المالية
 *                     organization_id: 1
 *                     parent_id: null
 *                     is_active: true
 *       401:
 *         description: غير مصرّح — JWT مفقود أو غير صالح
 */
router.get(
  '/accessible-scope',
  authMiddleware,
  authorize('GET_TASK_COMPLETED_BY_DEPARTMENT'),
  getAccessibleDepartments
)

/**
 * @swagger
 * /api/department/by-organization/{organizationId}/leaves:
 *   get:
 *     summary: جلب آخر هرمية للأقسام التابعة لمؤسسة
 *     description: |
 *       يعيد فقط الأقسام التي لا يوجد لها أبناء، مع اسم كامل يمثل المسار من الجذر
 *       (مثل `قسم المحاسبة\شعبة التدقيق`).
 *
 *       **هذا الـ API يدعم Caching + Retry limit:**
 *       - **Caching:** Redis key = `department:leaves:{organizationId}` — TTL = `API_CACHE_TTL_SECONDS`
 *       - **Retry limit:** `retryWithBackoff` — عدد المحاولات = `RETRY_MAX_ATTEMPTS`
 *
 *       **شكل الاستجابة:** `{ success, status_code, message, data }`
 *     tags: [Department]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: آخر هرمية للأقسام
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentLeavesEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب البيانات بنجاح
 *               data:
 *                 - id: 3
 *                   name: قسم المحاسبة\شعبة التدقيق
 *                 - id: 8
 *                   name: قسم الموارد البشرية\شعبة التوظيف
 *       400:
 *         description: معرّف المؤسسة غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: المؤسسة غير موجودة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/by-organization/:organizationId/leaves',
  authMiddleware,
  authorize('TASK_SIGNING'),
  getLeafDepartmentsByOrganization
)
/**
 * @swagger
 * /api/department/admin/by-organization/{organizationId}/leaves:
 *   get:
 *     summary: جلب آخر هرمية للأقسام التابعة لمؤسسة
 *     description: |
 *       يعيد فقط الأقسام التي لا يوجد لها أبناء، مع اسم كامل يمثل المسار من الجذر
 *       (مثل `قسم المحاسبة\شعبة التدقيق`).
 *
 *       **هذا الـ API يدعم Caching + Retry limit:**
 *       - **Caching:** Redis key = `department:leaves:{organizationId}` — TTL = `API_CACHE_TTL_SECONDS`
 *       - **Retry limit:** `retryWithBackoff` — عدد المحاولات = `RETRY_MAX_ATTEMPTS`
 *
 *       **شكل الاستجابة:** `{ success, status_code, message, data }`
 *     tags: [Department]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: آخر هرمية للأقسام
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentLeavesEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب البيانات بنجاح
 *               data:
 *                 - id: 3
 *                   name: قسم المحاسبة\شعبة التدقيق
 *                 - id: 8
 *                   name: قسم الموارد البشرية\شعبة التوظيف
 *       400:
 *         description: معرّف المؤسسة غير صالح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: المؤسسة غير موجودة
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.get(
  '/admin/by-organization/:organizationId/leaves',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getLeafDepartmentsByOrganization
)

/**
 * @swagger
 * /api/department/{id}/toggle-status:
 *   patch:
 *     summary: قلب حالة تفعيل القسم (is_active)
 *     description: يقلب قيمة is_active من true إلى false أو العكس.
 *     tags: [Department]
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
 *         description: toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentEnvelope'
 */
router.patch(
  '/:id/toggle-status',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  toggleDepartmentStatus
)

/**
 * @swagger
 * /api/department/{id}/overview:
 *   get:
 *     summary: نظرة عامة على القسم (المدير، الموظفون، الشعب، عدد المعاملات)
 *     description: |
 *       يجمع في طلب واحد كل ما تحتاجه بطاقة القسم: المدير (أعلى دور في القسم)،
 *       قائمة الموظفين المعيّنين، الشعب التابعة (الأقسام الأبناء)، وعدد المعاملات.
 *     tags: [Department]
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
 *         description: department overview
 */
router.get(
  '/:id/overview',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getDepartmentOverview
)

/**
 * @swagger
 * /api/department/{id}:
 *   get:
 *     summary: جلب قسم حسب المعرف
 *     tags: [Department]
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
 *         description: department
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentEnvelope'
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getDepartmentById
)

module.exports = router
