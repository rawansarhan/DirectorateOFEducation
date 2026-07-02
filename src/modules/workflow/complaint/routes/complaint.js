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
 *     description: Retrieve all process definitions where is_complaint = true
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: رقم الصفحة (يبدأ من 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 70
 *           default: 3
 *         description: عدد العناصر في الصفحة
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
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: تم جلب معاملات الشكوى بنجاح
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           process_id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: شكوى مدرسة
 *                           code:
 *                             type: string
 *                             example: COMPLAINT_001
 *                           priority:
 *                             type: integer
 *                             example: 1
 *                           auth_stage:
 *                             type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 3
 *                         total:
 *                           type: integer
 *                           example: 12
 *                         total_pages:
 *                           type: integer
 *                           example: 4
 *                         has_next:
 *                           type: boolean
 *                           example: true
 *                         has_prev:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: خطأ في معاملات page أو limit
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