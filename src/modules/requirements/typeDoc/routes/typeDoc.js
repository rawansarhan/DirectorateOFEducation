'use strict'

const express = require('express')
const router = express.Router()

const {
  createTypeDoc,
  updateTypeDoc,
  getAllTypeDocs,
  getTypeDocById
} = require('../controllers/typeDocController')

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

/**
 * @swagger
 * /api/typeDoc:
 *   post:
 *     summary: إنشاء نوع وثيقة
 *     tags: [TypeDoc]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: وثيقة حكومية
 *     responses:
 *       201:
 *         description: تم الإنشاء
 */
router.post('/',
   authMiddleware,
   authorize('TYPE_DOC_CREATE'),
   createTypeDoc)

/**
 * @swagger
 * /api/typeDoc/{id}:
 *   put:
 *     summary: تحديث نوع وثيقة
 *     tags: [TypeDoc]
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
 *         description: تم التحديث
 */
router.put('/:id', 
  authMiddleware, 
  authorize('TYPE_DOC_UPDATE'),
  updateTypeDoc)

/**
 * @swagger
 * /api/typeDoc:
 *   get:
 *     summary: جلب كل أنواع الوثائق (مع ترقيم صفحات وبحث)
 *     tags: [TypeDoc]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *         description: رقم الصفحة
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 70 }
 *         description: عدد العناصر في الصفحة
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: نص البحث في اسم نوع الوثيقة (name)
 *     responses:
 *       200:
 *         description: قائمة أنواع الوثائق
 */
router.get('/',
   authMiddleware,
   authorize('TYPE_DOC_READ_ALL'),
    getAllTypeDocs)

/**
 * @swagger
 * /api/typeDoc/{id}:
 *   get:
 *     summary: جلب نوع وثيقة بالمعرّف
 *     tags: [TypeDoc]
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
 *         description: نوع الوثيقة
 */
router.get('/:id',
   authMiddleware,
   authorize('TYPE_DOC_READ_ONE'),
   getTypeDocById)

module.exports = router
