'use strict'

const express = require('express')
const router = express.Router()

const {
  createTypeDoc,
  updateTypeDoc,
  getAllTypeDocs,
  getTypeDocById
} = require('../controllers/typeDocController')

const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

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
router.post('/', authMiddleware, createTypeDoc)

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
router.put('/:id', authMiddleware, updateTypeDoc)

/**
 * @swagger
 * /api/typeDoc:
 *   get:
 *     summary: جلب كل أنواع الوثائق
 *     tags: [TypeDoc]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة أنواع الوثائق
 */
router.get('/', authMiddleware, getAllTypeDocs)

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
router.get('/:id', authMiddleware, getTypeDocById)

module.exports = router
