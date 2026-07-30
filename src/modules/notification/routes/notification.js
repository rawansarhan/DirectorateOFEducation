'use strict'

const express = require('express')
const router = express.Router()

const {
  getMyNotificationsController,
  markNotificationReadController,
  markNotificationsReadController
} = require('../controllers/notificationController')

const { authMiddleware } = require('../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/notifications/my:
 *   get:
 *     summary: List authenticated user's notifications
 *     description: |
 *       يعرض إشعارات المستخدم المسجّل (المستلم) مع **Cursor Pagination**.
 *       استخدم `pagination.next_cursor` كـ `cursor` للصفحة التالية.
 *
 *       **نجاح:** `{ success, status_code, message, data }`
 *       **خطأ:** `{ success, status_code, message, error, data: null }`
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: من `pagination.next_cursor` للصفحة التالية
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *         description: عند true يُعرض فقط غير المقروء
 *     responses:
 *       200:
 *         description: تم جلب الإشعارات بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             limit:
 *                               type: integer
 *                               example: 10
 *                             cursor:
 *                               type: string
 *                               nullable: true
 *                             next_cursor:
 *                               type: string
 *                               nullable: true
 *                             has_next:
 *                               type: boolean
 *                             has_prev:
 *                               type: boolean
 *                         unread_count:
 *                           type: integer
 *             example:
 *               success: true
 *               status_code: 200
 *               message: تم جلب الإشعارات بنجاح
 *               data:
 *                 items:
 *                   - id: 42
 *                     title: رفض معاملة
 *                     message: لقد تم رفض معاملتك بسبب نقص الوثائق
 *                     type: transaction_rejected
 *                     is_read: false
 *                     created_at: '2026-07-17T10:00:00.000Z'
 *                 pagination:
 *                   limit: 10
 *                   cursor: null
 *                   next_cursor: eyJrIjoibm90aWYiLCJ0IjoiMjAyNi0wNy0xN1QxMDowMDowMC4wMDBaIiwiaWQiOjQyfQ
 *                   has_next: true
 *                   has_prev: false
 *                 unread_count: 3
 *       400:
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
 */
router.get(
  '/my',
  authMiddleware,
  getMyNotificationsController
)

/**
 * @swagger
 * /api/notifications/read:
 *   patch:
 *     summary: Mark multiple notifications as read
 *     description: |
 *       يعلّم عدة إشعارات كمقروءة دفعة واحدة للمستخدم المسجّل.
 *       يُحدَّث فقط ما يخص حسابه من القائمة.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notification_ids]
 *             properties:
 *               notification_ids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: integer
 *                   minimum: 1
 *                 example: [42, 43, 44]
 *           example:
 *             notification_ids: [42, 43, 44]
 *     responses:
 *       200:
 *         description: تم تعليم الإشعارات كمقروءة
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                         updated_count:
 *                           type: integer
 *                           example: 3
 *                         not_found_ids:
 *                           type: array
 *                           items:
 *                             type: integer
 *                           example: []
 *                         unread_count:
 *                           type: integer
 *                           example: 1
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: لا يوجد أي إشعار من القائمة يخص الحساب
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
 */
router.patch(
  '/read',
  authMiddleware,
  markNotificationsReadController
)

router.put(
  '/read',
  authMiddleware,
  markNotificationsReadController
)

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: يعلّم إشعاراً واحداً كمقروء للمستخدم المسجّل (فقط إن كان موجهاً إليه).
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: تم تعليم الإشعار كمقروء
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: الإشعار غير موجود
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
 */
router.patch(
  '/:notificationId/read',
  authMiddleware,
  markNotificationReadController
)

router.put(
  '/:notificationId/read',
  authMiddleware,
  markNotificationReadController
)

module.exports = router
