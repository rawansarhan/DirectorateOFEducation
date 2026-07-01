'use strict'

const express = require('express')
const router = express.Router()

const {
  getAllEmployees,
  getEmployeeById,
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
