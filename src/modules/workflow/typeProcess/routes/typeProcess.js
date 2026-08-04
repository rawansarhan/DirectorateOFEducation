const express = require('express')
const router = express.Router()

const {
  createTypeProcess,
  updateTypeProcess,
  getAlltype,
  getEverytype
} = require('../controllers/typeProcessController')

const { authMiddleware ,authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/typeProcess:
 *   post:
 *     summary: إنشاء نوع عملية جديد
 *     description: |
 *       ينشئ نوع معاملة جديد. يجب إرسال `name` و `code`.
 *       `code`: 2-20 حرف (A-Z, 0-9, _) — يُستخدم لاحقاً في `id_process`.
 *     tags: [TypeProcess]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TypeProcessCreate'
 *     responses:
 *       201:
 *         description: created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TypeProcessEnvelope'
 */
router.post(
  '/',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  createTypeProcess
)

/**
 * @swagger
 * /api/typeProcess/{id}:
 *   put:
 *     summary: تعديل نوع عملية
 *     tags: [TypeProcess]
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
 *             $ref: '#/components/schemas/TypeProcessUpdate'
 *     responses:
 *       200:
 *         description: updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TypeProcessEnvelope'
 */
router.put(
  '/:id',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  updateTypeProcess
)

/**
 * @swagger
 * /api/typeProcess/employee:
 *   get:
 *     summary: جلب كل أنواع العمليات
 *     tags: [TypeProcess]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TypeProcessListEnvelope'
 */
router.get(
  '/employee',
  authMiddleware,
  authorize('GET_ORGANIZATIONAL_STRUCTURE'),
  getAlltype
)

/**
 * @swagger
 * /api/typeProcess:
 *   get:
 *     summary: جلب كل أنواع العمليات
 *     tags: [TypeProcess]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TypeProcessListEnvelope'
 */
router.get(
  '/',
  authMiddleware,
  authorize('TRANSACTION_SUBMIT'),
  getAlltype
)

/**
 * @swagger
 * /api/typeProcess/all:
 *   get:
 *     summary: جلب كل أنواع العمليات (الفعّالة وغير الفعّالة)
 *     description: يرجع جميع أنواع العمليات بغض النظر عن قيمة is_active (true أو false).
 *     tags: [TypeProcess]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TypeProcessListEnvelope'
 */
router.get(
  '/all',
  authMiddleware,
  authorize('PROCESS_PUBLISH_MANAGE'),
  getEverytype
)

module.exports = router