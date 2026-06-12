'use strict'

const express = require('express')
const router = express.Router()

const {
  getMyNotificationsController,
  markNotificationReadController
} = require('../controllers/notificationController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/notifications/my:
 *   get:
 *     summary: List authenticated user's notifications
 *     description: |
 *       يعرض إشعارات المستخدم المسجّل (المستلم) مع pagination.
 *
 *       **نجاح:** `{ success, status_code, message, data }`
 *       **خطأ:** `{ success, status_code, message, error, data: null }`
 *     tags: [Notifications]
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
 *           default: 10
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *         description: عند true يُعرض فقط غير المقروء
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: فلترة حسب نوع الإشعار (مثل transaction_rejected)
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
 *                         unread_count:
 *                           type: integer
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

module.exports = router
