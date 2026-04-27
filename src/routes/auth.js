const express = require('express')
const router = express.Router()

const  {
 registerEmployeeUser,
   registerCitizenUser ,
  loginUser
} = require('../controllers/AuthController')

// register
/**
 * @swagger
 * /api/auth/register/employee:
 *   post:
 *     tags: [Auth]
 *     summary: Register employee
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterEmployeeRequest'
 *     responses:
 *       201:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/register/employee', registerEmployeeUser)
 /**
 * @swagger
 * /api/auth/register/citizen:
 *   post:
 *     tags: [Auth]
 *     summary: Register citizen
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterCitizenRequest'
 *     responses:
 *       201:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/register/citizen',registerCitizenUser)

// login
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
router.post('/login', loginUser)

module.exports = router