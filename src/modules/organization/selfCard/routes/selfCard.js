'use strict'

const express = require('express')
const router = express.Router()

const {
  searchSelfCards,
  recommendByMissingTraining,
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
 *       عند الإرسال في employee_picker:
 *       `{ "self_card_id": <id>, "path_self_card": "<optional.pdf>" }`
 *       — `self_card_id` إلزامي، `path_self_card` اختياري (PDF).
 *       افتراضياً يعيد البطاقات النشطة فقط (`active_only=true`).
 *       **Redis cache:** مفتاح `self-cards:search:...` — TTL = `API_CACHE_TTL_SECONDS`.
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
 * /api/self-cards/recommend-by-training:
 *   get:
 *     summary: ترشيح بطاقات لم تحضر دورة بعنوان معيّن
 *     description: |
 *       يعيد `employee_self_cards` الذين **لم** يحضروا دورة قريبة من `title`
 *       (تشابه حرفي + تداخل كلمات للمعنى التقريبي).
 *
 *       الترتيب:
 *       1. من لم يحضر أي دورة أبداً
 *       2. من لديهم دورات لكن غير مطابقة للعنوان (الأقل تشابهاً أولاً)
 *
 *       من تجاوز عتبة التشابه (~0.62) يُستبعد لأنه يُعدّ قد حضر الدورة.
 *     tags: [SelfCard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         required: true
 *         schema: { type: string, maxLength: 256 }
 *         description: عنوان الدورة المطلوب
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *         description: عدد النتائج المطلوبة
 *       - in: query
 *         name: organization_id
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: قائمة مرشّحة مرتّبة
 *   post:
 *     summary: ترشيح بطاقات لم تحضر دورة (body)
 *     tags: [SelfCard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               limit: { type: integer, default: 20 }
 *               organization_id: { type: integer }
 *     responses:
 *       200:
 *         description: قائمة مرشّحة مرتّبة
 */
router.get(
  '/recommend-by-training',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE', 'ORGANIZATIONAL_STRUCTURE_CREATE'),
  recommendByMissingTraining
)

router.post(
  '/recommend-by-training',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE', 'ORGANIZATIONAL_STRUCTURE_CREATE'),
  recommendByMissingTraining
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
 *     description: |
 *       البطاقة مع السجلات التاريخية.
 *       **Redis cache:** مفتاح `self-cards:id:{id}` — TTL = `API_CACHE_TTL_SECONDS`.
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
