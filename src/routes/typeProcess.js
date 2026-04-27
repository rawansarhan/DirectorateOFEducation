const express = require('express')
const router = express.Router()

const {
  createTypeProcess,
  updateTypeProcess,
  getAlltype
} = require('../controllers/TypeProcessController')

const { authMiddleware ,authorize } = require('../middleware/authMiddleware')

/**
 * @swagger
 * /api/typeProcess:
 *   post:
 *     summary: إنشاء نوع عملية جديد
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
  authorize('TYPETPROCESS_CREATE'),
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
  authorize('TYPETPROCESS_UPDATE'),
  updateTypeProcess
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
  authorize('TYPETPROCESS_VIEW'),
  getAlltype
)

module.exports = router