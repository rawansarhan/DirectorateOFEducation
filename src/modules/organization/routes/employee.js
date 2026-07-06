'use strict'

const express = require('express')
const router = express.Router()

const {
  getAllEmployees,
  getEmployeeById,
  getEmployeesByDepartments,
  updateEmployee
} = require('../controllers/EmployeeController')

const { authMiddleware, authorize } = require('../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: Employee
 *   description: إدارة الموظفين (المستخدمون من غير المواطنين)
 */

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: جلب كل الموظفين (مع ترقيم صفحات وبحث)
 *     description: |
 *       يعيد الموظفين فقط (يستبعد المواطنين CITIZEN)، مع اسم المؤسسة والقسم والدور.
 *       يدعم الترقيم عبر page/limit والبحث عبر search (الاسم، اسم المستخدم، البريد، الرقم الوطني).
 *     tags: [Employee]
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
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: بحث بالاسم أو اسم المستخدم أو البريد أو الرقم الوطني
 *     responses:
 *       200:
 *         description: قائمة الموظفين مع معلومات الترقيم
 */
router.get(
  '/',
  authMiddleware,
  authorize('EMPLOYEE_VIEW'),
  getAllEmployees
)

/**
 * @swagger
 * /api/employees/by-departments:
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
 *     tags: [Employee]
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
 *         description: قائمة موظفي الدوائر مع عبء العمل
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentEmployeesByDepartmentsEnvelope'
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب موظفي الدوائر بنجاح
 *               data:
 *                 items:
 *                   - assignment_id: 101
 *                     employee_id: 22
 *                     first_name: أحمد
 *                     last_name: الحسن
 *                     father_name: محمد
 *                     mother_name: فاطمة
 *                     national_id: '01234567890'
 *                     organization_department_roles_id: 12
 *                     department:
 *                       id: 7
 *                       name: شعبة الموارد البشرية
 *                     role:
 *                       id: 4
 *                       name: موظف معاملات
 *                       code: TRANSACTION_CLERK
 *                     tasks:
 *                       in_progress: 2
 *                       pending_pickup: 6
 *                       active_total: 8
 *                       completed: 34
 *                     workload_percent: 45
 *                     status: active
 *                     status_label: نشط
 *                   - assignment_id: 102
 *                     employee_id: 23
 *                     first_name: سارة
 *                     last_name: يعقوب
 *                     father_name: خالد
 *                     mother_name: لينا
 *                     national_id: '09876543210'
 *                     organization_department_roles_id: 12
 *                     department:
 *                       id: 7
 *                       name: شعبة الموارد البشرية
 *                     role:
 *                       id: 4
 *                       name: موظف معاملات
 *                       code: TRANSACTION_CLERK
 *                     tasks:
 *                       in_progress: 0
 *                       pending_pickup: 0
 *                       active_total: 0
 *                       completed: 12
 *                     workload_percent: 0
 *                     status: inactive
 *                     status_label: غير نشط
 *                   - assignment_id: 115
 *                     employee_id: 31
 *                     first_name: عمر
 *                     last_name: الدرويش
 *                     father_name: يوسف
 *                     mother_name: هناء
 *                     national_id: '01122334455'
 *                     organization_department_roles_id: 14
 *                     department:
 *                       id: 8
 *                       name: شعبة الأرشيف
 *                     role:
 *                       id: 5
 *                       name: مراجع
 *                       code: REVIEWER
 *                     tasks:
 *                       in_progress: 5
 *                       pending_pickup: 3
 *                       active_total: 8
 *                       completed: 67
 *                     workload_percent: 72
 *                     status: overloaded
 *                     status_label: مثقل
 *                 pagination:
 *                   limit: 3
 *                   cursor: null
 *                   next_cursor: eyJrIjoiZGVwdF9lbXAiLCJpZCI6MTE1fQ==
 *                   has_next: true
 *                   has_prev: false
 *       400:
 *         description: department_ids مفقود أو غير صالح
 *       403:
 *         description: لا صلاحية لإحدى الدوائر المطلوبة
 */
router.get(
  '/by-departments',
  authMiddleware,
  // authorize('DEPARTMENT_VIEW'),
  getEmployeesByDepartments
)

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: جلب موظف حسب المعرّف
 *     tags: [Employee]
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
 *         description: بيانات الموظف
 *       404:
 *         description: الموظف غير موجود
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('EMPLOYEE_VIEW'),
  getEmployeeById
)

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: تعديل بيانات موظف
 *     description: |
 *       كل الحقول اختيارية ويجب إرسال حقل واحد على الأقل. القواعد:
 *       - password يتطلب confirm_password مطابقاً، و pin يتطلب confirm_pin مطابقاً.
 *       - تغيير الدور/القسم/المؤسسة يتطلب إرسال organization_id و department_id و role_id معاً
 *         (يجب أن يوجد organization_department_role مطابق مسبقاً).
 *       - public_key يحدّث المفتاح العام (ويُحسب key_fingerprint جديد)؛
 *         private_key اختياري ويتطلب public_key و pin (يُتحقق من المطابقة ويُشفَّر داخلياً فقط).
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               father_name: { type: string }
 *               mother_name: { type: string }
 *               national_id: { type: string, example: "12345678901" }
 *               userName: { type: string }
 *               email: { type: string, format: email }
 *               phone_number: { type: string, example: "0912345678" }
 *               is_active: { type: boolean }
 *               organization_id: { type: integer }
 *               department_id: { type: integer }
 *               role_id: { type: integer }
 *               password: { type: string }
 *               confirm_password: { type: string }
 *               pin: { type: string, example: "123456" }
 *               confirm_pin: { type: string, example: "123456" }
 *               public_key: { type: string }
 *               private_key: { type: string }
 *     responses:
 *       200:
 *         description: تم تعديل بيانات الموظف
 *       400:
 *         description: بيانات غير صالحة
 *       404:
 *         description: الموظف غير موجود
 *       409:
 *         description: تعارض في حقل فريد (بريد/اسم مستخدم/رقم وطني)
 */
router.put(
  '/:id',
  authMiddleware,
  authorize('EMPLOYEE_UPDATE'),
  updateEmployee
)

module.exports = router
