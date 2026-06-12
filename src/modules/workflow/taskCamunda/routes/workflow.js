const express = require('express')

const router = express.Router()



const {

  startWorkflowController,

  createSigningChallengeController,

  createDocumentSubmitSigningChallengeController,

  completeDocumentSubmitController,

  completeTaskController,

  getAllTasksController,

  getInProgressTasksController,

  getPendingPickupTasksController,

  getCompletedByDepartmentController,

  getRejectedByDepartmentController,

  getCompletedLastMonthStatsController,

  getRejectedLastMonthStatsController,

  getActiveStatsController,

  getTaskDetailsController

} = require('../controllers/taskController')



const { authMiddleware } = require('../../../../core/middleware/authMiddleware')

const {

  signingChallengeLimiter,

  completeTaskLimiter

} = require('../../../../core/security/rateLimitMiddleware')



/**

 * @swagger

 * /api/workflow/tasks:

 *   get:

 *     summary: Get all employee tasks (paginated)

 *     description: |

 *       المعاملات **بانتظار الاستلام** (`pending_pickup`) و**قيد التنفيذ** (`in_progress`) للموظف.

 *       الافتراضي: `status=active`. استخدم `completed` أو `rejected` للمعاملات المنتهية.

 *       الترتيب: process_priority ASC (1=عالي أولاً) ثم تاريخ إنشاء الطلب ASC.

 *       **Response format (موحّد):**

 *       - نجاح: `{ success, status_code, message, data }`

 *       - خطأ: `{ success, status_code, message, error, data: null }`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: query

 *         name: status

 *         schema:

 *           type: string

 *           enum: [active, completed, rejected]

 *           default: active

 *       - in: query

 *         name: page

 *         schema:

 *           type: integer

 *           minimum: 1

 *           default: 1

 *       - in: query

 *         name: limit

 *         schema:

 *           type: integer

 *           minimum: 1

 *           maximum: 70

 *           default: 3

 *     responses:

 *       200:

 *         description: تم جلب المهام بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/WorkflowTasksListResponse'

 *       400:

 *         description: خطأ في معاملات الطلب

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *             examples:

 *               validation:

 *                 $ref: '#/components/schemas/WorkflowValidationErrorExample'

 *       500:

 *         description: خطأ داخلي

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 */

router.get('/tasks', authMiddleware, getAllTasksController)

/**

 * @swagger

 * /api/workflow/tasks/in-progress:

 *   get:

 *     summary: مهام الموظف — قيد التنفيذ فقط

 *     description: |

 *       معاملات مقفولة لدى الموظف الحالي (`status: in_progress`).

 *       الترتيب: process_priority ASC (1=عالي أولاً) ثم تاريخ إنشاء الطلب ASC.

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: query

 *         name: page

 *         schema: { type: integer, minimum: 1, default: 1 }

 *       - in: query

 *         name: limit

 *         schema: { type: integer, minimum: 1, maximum: 70, default: 3 }

 *     responses:

 *       200:

 *         description: تم جلب المهام بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/WorkflowTasksListResponse'

 */

router.get('/tasks/in-progress', authMiddleware, getInProgressTasksController)

/**

 * @swagger

 * /api/workflow/tasks/pending-pickup:

 *   get:

 *     summary: مهام الموظف — بانتظار الاستلام فقط

 *     description: |

 *       معاملات بانتظار استلام الموظف (`status: pending_pickup`).

 *       الترتيب: أولوية العملية DESC ثم تاريخ المعاملة ASC.

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: query

 *         name: page

 *         schema: { type: integer, minimum: 1, default: 1 }

 *       - in: query

 *         name: limit

 *         schema: { type: integer, minimum: 1, maximum: 70, default: 3 }

 *     responses:

 *       200:

 *         description: تم جلب المهام بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/WorkflowTasksListResponse'

 */

router.get('/tasks/pending-pickup', authMiddleware, getPendingPickupTasksController)

/**

 * @swagger

 * /api/workflow/tasks/completed/by-department:

 *   get:

 *     summary: معاملات منجزة مرت بدائرة/شعب (واحدة أو أكثر)

 *     description: |

 *       معاملات `status=completed` مرّت بمرحلة مرتبطة بأي من الدوائر المحددة عبر `stage_assignments`.

 *       يتطلب أن يكون للموظف دوراً في **كل** دائرة مُرسلة.

 *

 *       **أمثلة:**

 *       - `?department_ids=1,2,3`

 *       - `?department_ids=1&from_date=2026-01-01&to_date=2026-01-31`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: query

 *         name: department_ids

 *         required: true

 *         schema: { type: string, example: '1,2,3' }

 *         description: معرّفات الدوائر/الشعب (مفصولة بفاصلة أو مكررة)

 *       - in: query

 *         name: from_date

 *         schema: { type: string, format: date, example: '2026-01-01' }

 *         description: بداية الفترة (تاريخ إنشاء المعاملة). اختياري.

 *       - in: query

 *         name: to_date

 *         schema: { type: string, format: date, example: '2026-01-31' }

 *         description: نهاية الفترة (تاريخ إنشاء المعاملة). اختياري.

 *       - in: query

 *         name: page

 *         schema: { type: integer, minimum: 1, default: 1 }

 *       - in: query

 *         name: limit

 *         schema: { type: integer, minimum: 1, maximum: 70, default: 3 }

 *     responses:

 *       200:

 *         description: تم جلب المعاملات المنجزة للدوائر بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/WorkflowTasksListResponse'

 *       403:

 *         description: لا صلاحية لإحدى الدوائر

 */

router.get(
  '/tasks/completed/by-department',
  authMiddleware,
  getCompletedByDepartmentController
)

/**

 * @swagger

 * /api/workflow/tasks/rejected/by-department:

 *   get:

 *     summary: معاملات مرفوضة مرت بدائرة/شعب (واحدة أو أكثر)

 *     description: |

 *       معاملات `status=rejected` مرّت بمرحلة مرتبطة بأي من الدوائر المحددة.

 *       **أمثلة:** `?department_ids=1,2&from_date=2026-01-01&to_date=2026-01-31`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: query

 *         name: department_ids

 *         required: true

 *         schema: { type: string, example: '1,2,3' }

 *       - in: query

 *         name: from_date

 *         schema: { type: string, format: date, example: '2026-01-01' }

 *         description: بداية الفترة (تاريخ إنشاء المعاملة). اختياري.

 *       - in: query

 *         name: to_date

 *         schema: { type: string, format: date, example: '2026-01-31' }

 *         description: نهاية الفترة (تاريخ إنشاء المعاملة). اختياري.

 *       - in: query

 *         name: page

 *         schema: { type: integer, minimum: 1, default: 1 }

 *       - in: query

 *         name: limit

 *         schema: { type: integer, minimum: 1, maximum: 70, default: 3 }

 *     responses:

 *       200:

 *         description: تم جلب المعاملات المرفوضة للدوائر بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/WorkflowTasksListResponse'

 *       403:

 *         description: لا صلاحية لإحدى الدوائر

 */

router.get(
  '/tasks/rejected/by-department',
  authMiddleware,
  getRejectedByDepartmentController
)

/**

 * @swagger

 * /api/workflow/tasks/stats/completed-last-month:

 *   get:

 *     summary: عدد المعاملات المنجزة — آخر 30 يوماً

 *     description: |

 *       يُرجع عدد المعاملات `completed` التي مرت بالدوائر المحددة خلال آخر 30 يوماً.

 *       **Response format (موحّد):** `{ success, status_code, message, data }`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: query

 *         name: department_ids

 *         required: true

 *         schema: { type: string, example: '1,2,3' }

 *     responses:

 *       200:

 *         description: تم جلب الإحصائية بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/WorkflowTaskStatsResponse'

 *       403:

 *         description: لا صلاحية لإحدى الدوائر

 *

 * /api/workflow/tasks/stats/rejected-last-month:

 *   get:

 *     summary: عدد المعاملات المرفوضة — آخر 30 يوماً

 *     description: |

 *       يُرجع عدد المعاملات `rejected` التي مرت بالدوائر المحددة خلال آخر 30 يوماً.

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: query

 *         name: department_ids

 *         required: true

 *         schema: { type: string, example: '1,2,3' }

 *     responses:

 *       200:

 *         description: تم جلب الإحصائية بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/WorkflowTaskStatsResponse'

 *

 * /api/workflow/tasks/stats/active:

 *   get:

 *     summary: عدد المعاملات النشطة (قيد التنفيذ + بانتظار الاستلام)

 *     description: |

 *       يُرجع عدد المعاملات النشطة على **المراحل الحالية** التابعة للدوائر المحددة.

 *       يشمل `in_progress_count` و `pending_pickup_count`.

 *

 *       **department_ids:** معرّف **الدائرة** (`departments.id`) — وليس `organization_department_role id`.

 *       مثال: `?department_ids=12`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: query

 *         name: department_ids

 *         required: true

 *         schema: { type: string, example: '12' }

 *         description: departments.id (معرّف الدائرة) — ليس orgDeptRole id

 *     responses:

 *       200:

 *         description: تم جلب الإحصائية بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/WorkflowActiveStatsResponse'

 */

router.get(
  '/tasks/stats/completed-last-month',
  authMiddleware,
  getCompletedLastMonthStatsController
)

router.get(
  '/tasks/stats/rejected-last-month',
  authMiddleware,
  getRejectedLastMonthStatsController
)

router.get(
  '/tasks/stats/active',
  authMiddleware,
  getActiveStatsController
)



/**

 * @swagger

 * /api/workflow/tasks/{taskId}:

 *   get:

 *     summary: Get task details (task lock)

 *     description: |

 *       الخطوة 1 قبل complete أو signing-challenge — يُنشئ/يُجدّد **task lock** على السيرفر (لا يُعاد في الـ response).

 *

 *       **البيانات الرئيسية:**

 *       - `id_task` — استخدمه في مسار POST `/tasks/{taskId}/...`

 *       - `process_definition_name`, `name_task`, `applicant`, `submitted_at`

 *       - `transaction_history`: `{ id_process, priority, data }`

 *       - `currentStage`: المرحلة الحالية + `config` (استمارة الإكمال)

 *

 *       **لا يُعاد:** `taskLock`, `task`, `process`, `transaction` — القفل داخلي فقط.

 *

 *       **نجاح:** `{ success, status_code, message, data }`

 *       **خطأ:** `{ success, status_code, message, error, data: null }`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: path

 *         name: taskId

 *         required: true

 *         schema:

 *           type: string

 *     responses:

 *       200:

 *         description: تم جلب تفاصيل المهمة بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/TaskDetailsResponse'

 *       404:

 *         description: المهمة غير موجودة

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *             examples:

 *               notFound:

 *                 $ref: '#/components/schemas/WorkflowTaskNotFoundErrorExample'

 *       409:

 *         description: تعارض قفل المهمة

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *             examples:

 *               lockRequired:

 *                 $ref: '#/components/schemas/WorkflowTaskLockErrorExample'

 *       500:

 *         description: خطأ داخلي

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 */

router.get('/tasks/:taskId', authMiddleware, getTaskDetailsController)



/**

 * @swagger

 * /api/workflow/tasks/{taskId}/submit-documents/signing-challenge:

 *   post:

 *     summary: تحدي توقيع لتقديم وثائق الموظف (approve فقط)

 *     description: |

 *       للموظف عند رفع وثائق تتطلب توقيع USB — `decision` ثابت `approve`.

 *       **نجاح:** `{ success, status_code, message, data }`

 *       **خطأ:** `{ success, status_code, message, error, data: null }`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: path

 *         name: taskId

 *         required: true

 *         schema:

 *           type: string

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/DocumentSubmitSigningChallengePayload'

 *           example:

 *             pin: '123456'

 *     responses:

 *       200:

 *         description: تم إنشاء تحدي التوقيع

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/SigningChallengeResponse'

 */

router.post(
  '/tasks/:taskId/submit-documents/signing-challenge',
  authMiddleware,
  createDocumentSubmitSigningChallengeController
)



/**

 * @swagger

 * /api/workflow/tasks/{taskId}/submit-documents/complete:

 *   post:

 *     summary: إكمال تقديم وثائق موقّعة من الموظف

 *     description: |

 *       **تسلسل:** GET `/tasks/{taskId}` → POST `/submit-documents/signing-challenge` → وقّع `message` → POST `/submit-documents/complete`

 *

 *       **الحقول المطلوبة:** `stage_name`, `decision` (`approve` فقط), `files[]`, `signature`

 *

 *       **بدون:** `variables`, `templates`, `employee`

 *

 *       **Response:** `{ success, status_code, message, data }` — نفس شكل `CompleteTaskData`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: path

 *         name: taskId

 *         required: true

 *         schema:

 *           type: string

 *           example: 978bbc76-6650-11f1-ade6-2e8996ed1457

 *         description: من `id_task` في GET /tasks/{taskId}

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/DocumentSubmitCompletePayload'

 *           examples:

 *             full:

 *               summary: مثال كامل — رفع وثائق مع توقيع USB

 *               value:

 *                 stage_name: مرحلة رفع الوثائق

 *                 decision: approve

 *                 fields:

 *                   - key: citizen_name

 *                     value: روان سرحان

 *                 files:

 *                   - key: national_id_files

 *                     path: /uploads/signed-doc.pdf

 *                     type_doc_id: 3

 *                 note: ''

 *                 signature:

 *                   challenge_id: 3ad67615-8c89-4a5e-a758-217e9d85b6e6

 *                   signature: Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg==

 *     responses:

 *       200:

 *         description: تم تقديم الوثائق الموقّعة بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/CompleteTaskResponse'

 *             example:

 *               success: true

 *               status_code: 200

 *               message: تم تقديم الوثائق الموقّعة بنجاح

 *               data:

 *                 stage_name: مرحلة رفع الوثائق

 *                 fields:

 *                   - key: citizen_name

 *                     value: روان سرحان

 *                 files:

 *                   - key: national_id_files

 *                     path: /uploads/signed-doc.pdf

 *                     type_doc_id: 3

 *                 templates: []

 *                 decision: approve

 *                 note: ''

 *                 signature:

 *                   challenge_id: 3ad67615-8c89-4a5e-a758-217e9d85b6e6

 *                   signature: Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg==

 *                 idempotency_key: 0dbc8ad0-2618-4be2-8080-07e13c862d9b

 *                 idempotent_replay: false

 *                 workflow_status: running

 *       400:

 *         description: خطأ تحقق

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *       409:

 *         description: قفل مهمة / تعارض

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 */

router.post(
  '/tasks/:taskId/submit-documents/complete',
  authMiddleware,
  completeDocumentSubmitController
)



/**

 * @swagger

 * /api/workflow/tasks/{taskId}/signing-challenge:

 *   post:

 *     summary: Create transaction signing challenge (USB private key)

 *     description: |

 *       **الخطوة 2** قبل `complete` عندما تتطلب المرحلة توقيع USB.

 *

 *       **تسلسل:** GET task → signing-challenge → وقّع message → complete

 *

 *       **`decision`:** `approve` أو `reject`

 *

 *       **Response format (موحّد):**

 *       - نجاح: `{ success, status_code, message, data }`

 *       - خطأ: `{ success, status_code, message, error, data: null }`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: path

 *         name: taskId

 *         required: true

 *         schema:

 *           type: string

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/SigningChallengePayload'

 *     responses:

 *       200:

 *         description: تم إنشاء تحدي التوقيع بنجاح

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/SigningChallengeResponse'

 *       400:

 *         description: خطأ تحقق أو PIN/توقيع

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *             examples:

 *               validation:

 *                 $ref: '#/components/schemas/WorkflowValidationErrorExample'

 *       409:

 *         description: قفل المهمة / تعارض

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *       423:

 *         description: الحساب مقفل

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *       429:

 *         description: تجاوز حد الطلبات

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 */

router.post(

  '/tasks/:taskId/signing-challenge',

  authMiddleware,

  signingChallengeLimiter,

  createSigningChallengeController

)



/**

 * @swagger

 * /api/workflow/tasks/{taskId}/complete:

 *   post:

 *     summary: Complete workflow task

 *     description: |

 *       إكمال مهمة Camunda وحفظ بيانات المرحلة في `transaction.data[stage.code]`.

 *

 *       **تسلسل (مع توقيع USB):** GET `/tasks/{taskId}` → POST `/signing-challenge` → وقّع `message` → POST `/complete`

 *

 *       **الحقول:** `stage_name`, `employee`, `fields`, `files`, `templates`, `variables`, `decision`, `note`, `signature`

 *

 *       **`idempotency_key`:** يُولَّد من السيرفر — لا ترسله (يُعاد في `data.idempotency_key`)

 *

 *       **Response `data`:** `stage_name`, `fields`, `files`, `templates`, `variables`, `decision`, `note`, `signature`, `idempotency_key`, `idempotent_replay`, `workflow_status`

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: path

 *         name: taskId

 *         required: true

 *         schema:

 *           type: string

 *           example: 978bbc76-6650-11f1-ade6-2e8996ed1457

 *         description: من `id_task` في GET /tasks/{taskId}

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             $ref: '#/components/schemas/CompleteTaskPayload'

 *           examples:

 *             approve:

 *               summary: مثال كامل — موافقة مع توقيع USB

 *               value:

 *                 stage_name: التشيك على العمر

 *                 employee:

 *                   first_name: أحمد

 *                   last_name: علي

 *                   father_name: محمد

 *                   national_id: '12345678901'

 *                 fields:

 *                   - key: citizen_name

 *                     value: روان سرحان

 *                 files:

 *                   - key: national_id_files

 *                     path: /uploads/a.pdf

 *                     type_doc_id: 1

 *                 templates:

 *                   - id: 1

 *                     values:

 *                       full_name: روان سرحان

 *                 variables:

 *                   decision: over_50

 *                 decision: approve

 *                 note: ''

 *                 signature:

 *                   challenge_id: 3ad67615-8c89-4a5e-a758-217e9d85b6e6

 *                   signature: Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg==

 *             reject:

 *               $ref: '#/components/schemas/CompleteTaskRejectExample'

 *     responses:

 *       200:

 *         description: تم إكمال المهمة أو رفض المعاملة

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/CompleteTaskResponse'

 *             example:

 *               success: true

 *               status_code: 200

 *               message: تم إكمال المهمة بنجاح

 *               data:

 *                 stage_name: التشيك على العمر

 *                 fields:

 *                   - key: citizen_name

 *                     value: روان سرحان

 *                 files:

 *                   - key: national_id_files

 *                     path: /uploads/a.pdf

 *                     type_doc_id: 1

 *                 templates:

 *                   - template_id: 1

 *                     values:

 *                       full_name: روان سرحان

 *                     path: /uploads/templates/form.pdf

 *                 variables:

 *                   decision: over_50

 *                 decision: approve

 *                 note: ''

 *                 signature:

 *                   challenge_id: 3ad67615-8c89-4a5e-a758-217e9d85b6e6

 *                   signature: Bj7trXvyM9jfruXKttly27VY1xsVuqtKgcjfLf7fZrohjBGX0MwIFtYRMQ3nP5WHtbx0EFadm9rXy/RQqVw2Dg==

 *                 idempotency_key: 0dbc8ad0-2618-4be2-8080-07e13c862d9b

 *                 idempotent_replay: false

 *                 workflow_status: running

 *       400:

 *         description: خطأ تحقق

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *             examples:

 *               validation:

 *                 $ref: '#/components/schemas/WorkflowValidationErrorExample'

 *       409:

 *         description: قفل / تعارض إصدار / طلب مكرر

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *             examples:

 *               taskLock:

 *                 $ref: '#/components/schemas/WorkflowTaskLockErrorExample'

 *       423:

 *         description: الحساب مقفل

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *       429:

 *         description: تجاوز حد الطلبات

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *       500:

 *         description: خطأ داخلي

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 */

router.post(

  '/tasks/:taskId/complete',

  authMiddleware,

  completeTaskLimiter,

  completeTaskController

)



module.exports = router

