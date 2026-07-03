const express = require('express')
const router = express.Router()

const {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllDepartments,
  getDepartmentById,
  getDepartmentOverview,
  getDepartmentEmployees,
  getLeafDepartmentsByOrganization,
  toggleDepartmentStatus
} = require('../controllers/DepartmentController')

const { authMiddleware, authorize } = require('../../../core/middleware/authMiddleware')


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
  authorize('DEPARTMENT_CREATE'),
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
  authorize('DEPARTMENT_VIEW'),
  getAllDepartments
)

/**
 * @swagger
 * /api/department/by-organization/{organizationId}/leaves:
 *   get:
 *     summary: جلب آخر هرمية للأقسام التابعة لمؤسسة
 *     description: يعيد فقط الأقسام التي لا يوجد لها أبناء، مع اسم كامل يمثل المسار من الجذر (مثل "قسم المحاسبة\شعبة التدقيق")
 *     tags: [Department]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: leaves
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentLeavesEnvelope'
 */
router.get(
  '/by-organization/:organizationId/leaves',
  authMiddleware,
  authorize('DEPARTMENT_VIEW'),
  getLeafDepartmentsByOrganization
)

/**
 * @swagger
 * /api/department/employees:
 *   get:
 *     summary: موظفو دوائر/شعب (واحدة أو أكثر) مع عبء العمل
 *     description: |
 *       يعيد صفاً لكل تعيين موظف في دائرة (organization_department_role) مع:
 *       بيانات الهوية، اسم الدائرة والدور، عدد المهام النشطة (in_progress / pending_pickup)،
 *       عدد المراحل المكتملة، نسبة عبء العمل وحالة النشاط.
 *
 *       **حالات عبء العمل:**
 *       - `inactive` (غير نشط): 0%
 *       - `low_active` (قليل النشاط): أكثر من 0% حتى 20%
 *       - `active` (نشط): أكثر من 20% حتى 60%
 *       - `overloaded` (مثقل): أكثر من 60% حتى 100%
 *
 *       **Cursor Pagination:** استخدم `pagination.next_cursor` للصفحة التالية.
 *     tags: [Department]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department_ids
 *         required: true
 *         schema: { type: string, example: '1,2,3' }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 70, default: 3 }
 *     responses:
 *       200:
 *         description: قائمة موظفي الدوائر
 *       403:
 *         description: لا صلاحية لإحدى الدوائر
 */
router.get(
  '/employees',
  authMiddleware,
  authorize('DEPARTMENT_VIEW'),
  getDepartmentEmployees
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
  authorize('DEPARTMENT_TOGGLE_STATUS'),
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
  authorize('DEPARTMENT_VIEW'),
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
  authorize('DEPARTMENT_VIEW'),
  getDepartmentById
)

module.exports = router
