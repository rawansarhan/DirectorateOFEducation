'use strict'

const express = require('express')
const router = express.Router()
const {
  createField,
  updateField,
  getAllField
} = require('../controllers/Field')

/**
 * @swagger
 * /fields:
 *   get:
 *     summary: جلب كل الحقول
 *     tags: [Field]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: قائمة الحقول
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FieldListEnvelope'
 */

router.get('/', getAllField)

/**
 * @swagger
 * /fields:
 *   post:
 *     summary: إنشاء حقل جديد
 *     tags: [Field]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FieldCreate'
 *     responses:
 *       200:
 *         description: تم الإنشاء بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FieldEnvelope'
 */
router.post('/', createField)

/**
 * @swagger
 * /fields/{id}:
 *   put:
 *     summary: تعديل حقل
 *     tags: [Field]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: معرف الحقل
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FieldUpdate'
 *     responses:
 *       200:
 *         description: تم التعديل
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FieldEnvelope'
 */
router.put('/:id', updateField)

module.exports = router
