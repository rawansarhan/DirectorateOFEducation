'use strict'

const express = require('express')
const router = express.Router()

const { listAuditLogsController } = require('../controllers/auditLogController')
const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: Audit Logs
 *   description: عرض سجلات التدقيق الأمنية والإدارية (أدمن)
 */

/**
 * @swagger
 * /api/auth/audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: عرض سجلات audit_logs مع فلترة وترقيم cursor
 *     description: |
 *       صلاحية مطلوبة: `VIEW_AUDIT_LOGS`.
 *
 *       ### الحالات
 *       1. **بدون فلاتر** — كل السجلات، الأحدث أولاً، `limit=20` افتراضياً.
 *       2. **فلترة** — أي تركيب من: `user_id`, `action`, `status`, `resource_type`, `from_date`, `to_date`.
 *       3. **ترقيم cursor** — إن وُجد `pagination.has_next=true` أعد الطلب مع `cursor=pagination.next_cursor`.
 *       4. **صفحة فارغة** — `items: []` مع نفس شكل `pagination`.
 *
 *       ### أمثلة طلب
 *       - الكل: `/api/auth/audit-logs`
 *       - مستخدم: `?user_id=12&limit=20`
 *       - فعل: `?action=TASK_PICKED_UP`
 *       - حالة فشل: `?status=failure`
 *       - فترة: `?from_date=2026-08-01&to_date=2026-08-11`
 *       - مركّب + صفحة تالية:
 *         `?user_id=12&action=LOGOUT&status=success&from_date=2026-08-01&to_date=2026-08-11&limit=20&cursor=<next_cursor>`
 *
 *       الترتيب دائماً: `created_at DESC, id DESC`.
 *       `known_actions` قائمة أكواد الأحداث المعروفة في النظام.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: فلترة حسب منفّذ الحدث
 *         example: 12
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: كود الحدث (مثل TASK_PICKED_UP, LOGOUT, EMPLOYEE_UPDATED)
 *         example: TASK_PICKED_UP
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failure, blocked]
 *         example: success
 *       - in: query
 *         name: resource_type
 *         schema:
 *           type: string
 *         description: نوع المورد (user, task, transaction, process_definition, ...)
 *         example: task
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: بداية الفترة YYYY-MM-DD (شامل)
 *         example: 2026-08-01
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: نهاية الفترة YYYY-MM-DD (شامل)
 *         example: 2026-08-11
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: قيمة pagination.next_cursor من الاستجابة السابقة
 *         example: eyJrIjoiYXVkaXQiLCJ0IjoiMjAyNi0wOC0xMVQxMDowMDowMC4wMDBaIiwiaWQiOjEwMH0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         example: 20
 *     responses:
 *       200:
 *         description: قائمة سجلات التدقيق مع cursor pagination
 *         content:
 *           application/json:
 *             examples:
 *               all_no_filters:
 *                 summary: 1) بدون فلاتر — أول صفحة
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب سجلات التدقيق بنجاح
 *                   data:
 *                     items:
 *                       - id: 120
 *                         user_id: 12
 *                         action: TASK_PICKED_UP
 *                         resource_type: task
 *                         resource_id: "camunda-task-55"
 *                         status: success
 *                         ip_address: 192.168.1.20
 *                         user_agent: Mozilla/5.0
 *                         details:
 *                           taskId: camunda-task-55
 *                           transactionId: 44
 *                         created_at: "2026-08-11T14:30:00.000Z"
 *                         user:
 *                           id: 12
 *                           userName: emp.sara
 *                           first_name: سارة
 *                           last_name: أحمد
 *                           email: sara@example.com
 *                       - id: 119
 *                         user_id: 12
 *                         action: LOGOUT
 *                         resource_type: user
 *                         resource_id: "12"
 *                         status: success
 *                         ip_address: 192.168.1.20
 *                         user_agent: Mozilla/5.0
 *                         details:
 *                           refreshTokenId: 88
 *                         created_at: "2026-08-11T13:00:00.000Z"
 *                         user:
 *                           id: 12
 *                           userName: emp.sara
 *                           first_name: سارة
 *                           last_name: أحمد
 *                           email: sara@example.com
 *                       - id: 118
 *                         user_id: 3
 *                         action: REFRESH_TOKEN_REUSE
 *                         resource_type: user
 *                         resource_id: "3"
 *                         status: failure
 *                         ip_address: 10.0.0.9
 *                         user_agent: okhttp/4.12
 *                         details:
 *                           reason: REFRESH_TOKEN_REUSE_DETECTED
 *                           refreshTokenId: 70
 *                         created_at: "2026-08-11T12:45:00.000Z"
 *                         user:
 *                           id: 3
 *                           userName: citizen.ali
 *                           first_name: علي
 *                           last_name: حسن
 *                           email: ali@example.com
 *                       - id: 117
 *                         user_id: 12
 *                         action: ACCOUNT_ACCESS_BLOCKED
 *                         resource_type: user
 *                         resource_id: "12"
 *                         status: blocked
 *                         ip_address: 192.168.1.20
 *                         user_agent: Mozilla/5.0
 *                         details:
 *                           reason: ACCOUNT_LOCKED
 *                           path: /api/auth/pin/verify
 *                           method: POST
 *                         created_at: "2026-08-11T12:00:00.000Z"
 *                         user:
 *                           id: 12
 *                           userName: emp.sara
 *                           first_name: سارة
 *                           last_name: أحمد
 *                           email: sara@example.com
 *                     pagination:
 *                       limit: 20
 *                       cursor: null
 *                       next_cursor: eyJrIjoiYXVkaXQiLCJ0IjoiMjAyNi0wOC0xMVQxMjowMDowMC4wMDBaIiwiaWQiOjExN30
 *                       has_next: true
 *                       has_prev: false
 *                     known_actions:
 *                       - REFRESH_TOKEN_REUSE
 *                       - LOGOUT
 *                       - ACCOUNT_ACCESS_BLOCKED
 *                       - EMPLOYEE_REGISTERED
 *                       - EMPLOYEE_UPDATED
 *                       - ROLE_PERMISSIONS_CREATED
 *                       - ROLE_PERMISSIONS_UPDATED
 *                       - TRANSACTION_SUBMITTED
 *                       - TASK_COMPLETED
 *                       - TASK_REJECTED
 *                       - TASK_PICKED_UP
 *                       - TASK_RELEASED
 *                       - FINAL_DOCUMENT_SAVED
 *                       - FINAL_DOCUMENT_GENERATED
 *                       - PROCESS_CREATED
 *                       - PROCESS_REVIEWED
 *                       - PROCESS_STATUS_CHANGED
 *                       - ODR_CREATED
 *                       - ODR_STATUS_CHANGED
 *                       - ORGANIZATION_CREATED
 *                       - DEPARTMENT_CREATED
 *                       - DEPARTMENT_STATUS_CHANGED
 *                       - DEVICE_TOKEN_REGISTERED
 *                       - CITIZEN_REGISTER_STARTED
 *               filtered_compound:
 *                 summary: 2) فلترة مركّبة (user + action + status + تواريخ)
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب سجلات التدقيق بنجاح
 *                   data:
 *                     items:
 *                       - id: 95
 *                         user_id: 12
 *                         action: LOGOUT
 *                         resource_type: user
 *                         resource_id: "12"
 *                         status: success
 *                         ip_address: 192.168.1.20
 *                         user_agent: Mozilla/5.0
 *                         details:
 *                           refreshTokenId: 61
 *                         created_at: "2026-08-05T09:12:00.000Z"
 *                         user:
 *                           id: 12
 *                           userName: emp.sara
 *                           first_name: سارة
 *                           last_name: أحمد
 *                           email: sara@example.com
 *                     pagination:
 *                       limit: 20
 *                       cursor: null
 *                       next_cursor: null
 *                       has_next: false
 *                       has_prev: false
 *                     known_actions:
 *                       - LOGOUT
 *                       - TASK_PICKED_UP
 *               next_page:
 *                 summary: 3) صفحة تالية عبر cursor
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب سجلات التدقيق بنجاح
 *                   data:
 *                     items:
 *                       - id: 116
 *                         user_id: 8
 *                         action: FINAL_DOCUMENT_GENERATED
 *                         resource_type: transaction
 *                         resource_id: "44"
 *                         status: success
 *                         ip_address: 192.168.1.40
 *                         user_agent: Mozilla/5.0
 *                         details:
 *                           transactionId: 44
 *                           finalDocumentId: 9
 *                           document_instance_ids: [2, 5]
 *                           document_signature_ids: [3, 1]
 *                         created_at: "2026-08-11T11:50:00.000Z"
 *                         user:
 *                           id: 8
 *                           userName: emp.omar
 *                           first_name: عمر
 *                           last_name: خليل
 *                           email: omar@example.com
 *                     pagination:
 *                       limit: 20
 *                       cursor: eyJrIjoiYXVkaXQiLCJ0IjoiMjAyNi0wOC0xMVQxMjowMDowMC4wMDBaIiwiaWQiOjExN30
 *                       next_cursor: null
 *                       has_next: false
 *                       has_prev: true
 *                     known_actions:
 *                       - FINAL_DOCUMENT_GENERATED
 *               empty:
 *                 summary: 4) لا نتائج للفلتر
 *                 value:
 *                   success: true
 *                   status_code: 200
 *                   message: تم جلب سجلات التدقيق بنجاح
 *                   data:
 *                     items: []
 *                     pagination:
 *                       limit: 20
 *                       cursor: null
 *                       next_cursor: null
 *                       has_next: false
 *                       has_prev: false
 *                     known_actions:
 *                       - REFRESH_TOKEN_REUSE
 *                       - LOGOUT
 *                       - ACCOUNT_ACCESS_BLOCKED
 *                       - EMPLOYEE_REGISTERED
 *                       - TASK_PICKED_UP
 *                       - FINAL_DOCUMENT_GENERATED
 *       401:
 *         description: غير مصرح (بدون توكن أو توكن غير صالح)
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               status_code: 401
 *               message: غير مصرح
 *               error: UNAUTHORIZED
 *               data: null
 *       403:
 *         description: لا يملك صلاحية VIEW_AUDIT_LOGS
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               status_code: 403
 *               message: ليس لديك صلاحية لتنفيذ هذا الإجراء
 *               error: FORBIDDEN
 *               data: null
 *       400:
 *         description: cursor أو تواريخ غير صالحة
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               status_code: 400
 *               message: cursor غير صالح
 *               error: VALIDATION_ERROR
 *               data: null
 */
router.get(
  '/audit-logs',
  authMiddleware,
  authorize('VIEW_AUDIT_LOGS'),
  listAuditLogsController
)

module.exports = router
