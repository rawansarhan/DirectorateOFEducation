const express = require('express')
const router = express.Router()

const {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getAllOrganizations,
  getOrganizationById
} = require('../controllers/OrganizationController')

const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')


/**
 * @swagger
 * /api/organization:
 *   post:
 *     summary: إنشاء مؤسسة جديدة
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrganizationCreate'
 *     responses:
 *       201:
 *         description: created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrganizationEnvelope'
 */
router.post(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  createOrganization
)

// /**
//  * @swagger
//  * /api/organization/{id}:
//  *   put:
//  *     summary: تعديل مؤسسة
//  *     tags: [Organization]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/OrganizationUpdate'
//  *     responses:
//  *       200:
//  *         description: updated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/OrganizationEnvelope'
//  */
// router.put(
//   '/:id',
//   authMiddleware,
//   authorize('ORGANIZATION_UPDATE'),
//   updateOrganization
// )

// /**
//  * @swagger
//  * /api/organization/{id}:
//  *   delete:
//  *     summary: حذف مؤسسة
//  *     tags: [Organization]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *     responses:
//  *       200:
//  *         description: deleted
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/OrganizationDeleteEnvelope'
//  */
// router.delete(
//   '/:id',
//   authMiddleware,
//   authorize('ORGANIZATION_DELETE'),
//   deleteOrganization
// )

/**
 * @swagger
 * /api/organization:
 *   get:
 *     summary: جلب كل المؤسسات
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrganizationListEnvelope'
 */
router.get(
  '/',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getAllOrganizations
)

/**
 * @swagger
 * /api/organization/{id}:
 *   get:
 *     summary: جلب مؤسسة حسب المعرف
 *     tags: [Organization]
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
 *         description: organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrganizationEnvelope'
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('ORGANIZATIONAL_STRUCTURE_CREATE'),
  getOrganizationById
)

module.exports = router
