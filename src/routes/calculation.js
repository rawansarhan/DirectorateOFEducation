'use strict'

const express = require('express')
const router = express.Router()
const {
  createCalculation,
  updateCalculation,
  getAllcalculations
} = require('../controllers/Calculation')

/**
 * @openapi
 * /api/calculation:
 *   get:
 *     tags:
 *       - Calculation
 *     summary: عرض كل العمليات الحسابية
 *     operationId: getAllCalculations
 *     responses:
 *       200:
 *         description: نجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalculationListEnvelope'
 */
router.get('/', getAllcalculations)

/**
 * @openapi
 * /api/calculation:
 *   post:
 *     tags:
 *       - Calculation
 *     summary: إنشاء عملية حسابية
 *     operationId: createCalculation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalculationCreate'
 *     responses:
 *       200:
 *         description: تم الإنشاء
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalculationEnvelope'
 */
router.post('/', createCalculation)

/**
 * @openapi
 * /api/calculation/{id}:
 *   put:
 *     tags:
 *       - Calculation
 *     summary: تعديل عملية حسابية
 *     operationId: updateCalculation
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
 *             $ref: '#/components/schemas/CalculationUpdate'
 *     responses:
 *       200:
 *         description: تم التعديل
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalculationEnvelope'
 */
router.put('/:id', updateCalculation)

module.exports = router
