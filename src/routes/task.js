const express = require('express')
const router = express.Router()

const {
  getTaskFormController,
  completeTaskController,
  getMyTasksController
} = require('../controllers/taskController')

// 🔐 لازم يكون عندك middleware auth
// router.use(authMiddleware)

// =============================
// TASK FORM
// =============================
/**
 * @swagger
 * /tasks/{taskId}/form:
 *   get:
 *     summary: جلب تفاصيل الفورم الخاصة بالمهمة
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         example: "123"
 *     responses:
 *       200:
 *         description: نجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *                 stage:
 *                   $ref: '#/components/schemas/Stage'
 *                 form:
 *                   $ref: '#/components/schemas/TaskForm'
 */
router.get('/tasks/:taskId', getTaskFormController)

// =============================
// COMPLETE TASK
// =============================
/**
 * @swagger
 * /tasks/{taskId}/complete:
 *   post:
 *     summary: تنفيذ المهمة (approve / reject / return)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         example: "123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteTaskRequest'
 *     responses:
 *       200:
 *         description: تم التنفيذ بنجاح
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 action:
 *                   type: string
 *                   example: approve
 */
router.post('/tasks/:taskId/complete', completeTaskController)

// =============================
// MY TASKS (Dashboard)
// =============================
/**
 * @swagger
 * /tasks/my:
 *   get:
 *     summary: جلب جميع المهام الخاصة بالمستخدم
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 10
 *     responses:
 *       200:
 *         description: نجاح
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MyTasksResponse'
 */
router.get('/my-tasks', getMyTasksController)

module.exports = router