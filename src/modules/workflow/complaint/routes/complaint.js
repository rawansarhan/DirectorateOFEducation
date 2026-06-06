const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')
const express = require('express')
const router = express.Router()
const {
getComplaintProcesses
} = require('../controllers/complaintController')
 /**
 * @swagger
 * /api/complaint/complaints:
 *   get:
 *     summary: Get all complaint processes
 *     tags: [Complaint]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all process definitions where type is "شكوى"
 *     responses:
 *       200:
 *         description: تم جلب معاملات الشكوى بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: تم جلب معاملات الشكوى بنجاح
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: شكوى مدرسة
 *                       code:
 *                         type: string
 *                         example: COMPLAINT_001
 *                       status:
 *                         type: string
 *                         example: deployed
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       approval_status:
 *                         type: string
 *                         example: PENDING
 *                       type_trans_id:
 *                         type: integer
 *                         example: 2
 *       401:
 *         description: Unauthorized - تحتاج تسجيل دخول
 *       403:
 *         description: Forbidden - لا تملك صلاحية PROCESS_VIEW_COMPLAINT
 */
router.get(
  '/complaints',
  authMiddleware,
  getComplaintProcesses
)


module.exports = router