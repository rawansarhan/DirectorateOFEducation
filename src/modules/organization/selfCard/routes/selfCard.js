'use strict'

const express = require('express')
const router = express.Router()

const {
  searchSelfCards,
  getSelfCard,
  createSelfCard
} = require('../controllers/selfCardController')

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * tags:
 *   name: SelfCard
 *   description: البطاقة الذاتية (ملف شؤون الموظفين) — مستقلة عن حساب الدخول
 */

/**
 * @swagger
 * /api/self-cards/search:
 *   get:
 *     summary: بحث البطاقات الذاتية (للـ employee_picker)
 *     description: |
 *       يبحث في `employee_self_cards` بالاسم / الرقم الوطني / الرقم الذاتي.
 *       القيمة المعادة للاختيار: `id` (= self_card_id).
 *       افتراضياً يعيد البطاقات النشطة فقط (`active_only=true`).
 *     tags: [SelfCard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string, maxLength: 100 }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 70 }
 *       - in: query
 *         name: active_only
 *         schema: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: نتائج البحث مع ترقيم cursor
 */
router.get(
  '/search',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE', 'ORGANIZATIONAL_STRUCTURE_CREATE'),
  searchSelfCards
)

/**
 * @swagger
 * /api/self-cards:
 *   post:
 *     summary: إنشاء بطاقة ذاتية (ملف وظيفي)
 *     description: |
 *       لا يتطلب `user_id`. يمكن لاحقاً ربط حساب موظف عبر `user_id` الاختياري.
 *       مطلوب على الأقل `full_name` أو `national_id`.
 *     tags: [SelfCard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name: { type: string }
 *               national_id: { type: string }
 *               self_number: { type: string }
 *               father_name: { type: string }
 *               mother_name: { type: string }
 *               organization_id: { type: integer }
 *               user_id: { type: integer, nullable: true }
 *               is_active: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: تم الإنشاء
 *       409:
 *         description: تعارض رقم وطني أو user_id
 */
router.post(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  createSelfCard
)

/**
 * @swagger
 * /api/self-cards/{id}:
 *   get:
 *     summary: جلب بطاقة ذاتية بالمعرّف
 *     tags: [SelfCard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: البطاقة مع السجلات التاريخية
 *       404:
 *         description: غير موجودة
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE', 'ORGANIZATIONAL_STRUCTURE_CREATE'),
  getSelfCard
)

module.exports = router
