const { authMiddleware } = require('../../../core/middleware/authMiddleware')
const express = require('express')
const router = express.Router()
const {
  getComplaintProcesses,
  getCitizenComplaintProcessesHandler
} = require('../controllers/compalintController')

/**
 * @swagger
 * /api/complaint/complaints:
 *   get:
 *     summary: Get complaint process definitions (AUTH stage)
 *     tags: [Complaint]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم جلب عمليات AUTH بنجاح.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthProcessListResponse'
 *             example:
 *               message: تم جلب عمليات AUTH بنجاح
 *               data:
 *                 - process_id: 1
 *                   name: School Complaint
 *                   code: COMPLAINT_001
 *                   priority: 1
 *                   auth_stage:
 *                     id: 10
 *                     name: Submit Complaint
 *                     code: SUBMIT_COMPLAINT
 *                     type: USER_TASK
 *                     auth_type: AUTH
 *               from_cache: false
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 */
router.get(
  '/complaints',
  authMiddleware,
  getComplaintProcesses
)

/**
 * @swagger
 * /api/complaint/citizen/complaints:
 *   get:
 *     summary: Get citizen complaint processes (is_complaint=true)
 *     tags: [Complaint]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: تم جلب عمليات AUTH بنجاح.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthProcessListResponse'
 *             example:
 *               message: تم جلب عمليات AUTH بنجاح
 *               data:
 *                 - process_id: 2
 *                   name: Citizen Complaint
 *                   code: CITIZEN_COMPLAINT_001
 *                   priority: 1
 *                   auth_stage:
 *                     id: 11
 *                     name: Submit Complaint
 *                     code: CITIZEN_SUBMIT
 *                     type: USER_TASK
 *                     auth_type: AUTH
 *               from_cache: true
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 */
router.get(
  '/citizen/complaints',
  authMiddleware,
  getCitizenComplaintProcessesHandler
)

module.exports = router
