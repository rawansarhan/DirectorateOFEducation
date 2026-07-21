const express = require('express')

const router = express.Router()



const {

  startWorkflowController,

  createSigningChallengeController,

  completeTaskController,

  getAllTasksController,

  getCompletedByDepartmentController,

  getRejectedByDepartmentController,

  getCompletedLastMonthStatsController,

  getRejectedLastMonthStatsController,

  getActiveStatsController,

  getEmployeeCertificateController,

  getTaskDetailsController,

  pickupTaskController,

  releaseTaskController

} = require('../controllers/taskController')



const { authMiddleware, authorize } = require('../../../../core/middleware/authMiddleware')

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

 *       فلترة حسب حالة المهمة للموظف:

 *       - `all` (افتراضي): الكل — بانتظار الاستلام + قيد التنفيذ + منجزة + مرفوضة

 *       - `pending_pickup`: بانتظار الاستلام (غير مقفولة على أي موظف)

 *       - `in_progress`: قيد التنفيذ (مقفولة على موظف)

 *       - `completed`: مهام أنجزها الموظف نفسه

 *       - `rejected`: مهام رفضها الموظف نفسه

 *       - `active`: بانتظار الاستلام + قيد التنفيذ فقط (للتوافق)

 *

 *       الترتيب: process_priority ASC للمهام النشطة. عند `status=all` يُرتّب حسب activity_at تنازلياً.

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

 *           enum: [all, pending_pickup, in_progress, completed, rejected, active]

 *           default: all

 *       - in: query

 *         name: cursor

 *         required: false

 *         allowEmptyValue: true

 *         schema:

 *           type: string

 *           nullable: true

 *         example: ''

 *         description: |

 *           مؤشر الصفحة التالية (Cursor Pagination). اتركه فارغاً للصفحة الأولى؛

 *           للصفحة التالية استخدم قيمة pagination.next_cursor من الاستجابة السابقة.

 *           لا تضع قيمة مثل string من Swagger — احذف الحقل أو اتركه فارغاً.

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

 *         name: cursor

 *         required: false

 *         allowEmptyValue: true

 *         schema:

 *           type: string

 *           nullable: true

 *         example: ''

 *         description: |

 *           مؤشر الصفحة التالية (Cursor Pagination). اتركه فارغاً للصفحة الأولى؛

 *           للصفحة التالية استخدم قيمة pagination.next_cursor من الاستجابة السابقة.

 *           لا تضع قيمة مثل string من Swagger — احذف الحقل أو اتركه فارغاً.

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

 *         name: cursor

 *         required: false

 *         allowEmptyValue: true

 *         schema:

 *           type: string

 *           nullable: true

 *         example: ''

 *         description: |

 *           مؤشر الصفحة التالية (Cursor Pagination). اتركه فارغاً للصفحة الأولى؛

 *           للصفحة التالية استخدم قيمة pagination.next_cursor من الاستجابة السابقة.

 *           لا تضع قيمة مثل string من Swagger — احذف الحقل أو اتركه فارغاً.

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
  authorize('tasks_STATS_COMPLETED_LAST_MONTH'),
  getCompletedLastMonthStatsController
)

router.get(
  '/tasks/stats/rejected-last-month',
  authMiddleware,
  authorize('tasks_STATS_REJECTED_LAST_MONTH'),
  getRejectedLastMonthStatsController
)

router.get(
  '/tasks/stats/active',
  authMiddleware,
  authorize('tasks_STATS_ACTIVE'),
  getActiveStatsController
)



/**

 * @swagger

 * /api/workflow/transactions/{transactionId}/certificate:

 *   get:

 *     summary: بيانات الشهادة للطباعة (موظف)

 *     description: |

 *       نفس payload مسار `/api/transaction/{transactionId}/certificate`.

 *       **Auth:** Bearer (تسجيل دخول فقط — بدون تقييد دور داخل المنطق)

 *       متاح لأي حالة معاملة — يعرض transaction_history حتى لو لم تكتمل.

 *     tags: [Workflow]

 *     security:

 *       - bearerAuth: []

 *     parameters:

 *       - in: path

 *         name: transactionId

 *         required: true

 *         schema:

 *           type: integer

 *     responses:

 *       200:

 *         description: بيانات الشهادة

 *       400:

 *         description: خطأ في الطلب

 *       404:

 *         description: المعاملة غير موجودة

 */


router.get(
  '/transactions/:transactionId/certificate',
  authMiddleware,
  getEmployeeCertificateController
)



/**

 * @swagger

 * /api/workflow/tasks/{taskId}:

 *   get:

 *     summary: Get task details (preview — no lock)

 *     description: |

 *       **عرض فقط** — لا يُنشئ قفلاً على المعاملة.

 *       استخدم `POST /api/workflow/tasks/{taskId}/pickup` لاستلام المعاملة قبل complete أو signing-challenge.

 *

 *       **البيانات الرئيسية:**

 *       - `id_task` — استخدمه في مسار POST `/tasks/{taskId}/...`

 *       - `process_definition_name`, `name_task`, `applicant`, `submitted_at`

 *       - `transaction_history`: `{ process_name, priority, data }`

 *       - `currentStage`: المرحلة الحالية + `config` (استمارة الإكمال)

 *       - `task_lock`: حالة القفل (`can_pickup`, `can_release`, `locked_by_me`, ...)

 *

 *       **نجاح:** `{ success, status_code, message, data }`

 *       **خطأ:** `{ success, status_code, message, error, data: null }`

 *     tags: [Workflow, Task Lock]

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

 * /api/workflow/tasks/{taskId}/pickup:

 *   post:

 *     summary: استلام المعاملة (task lock)

 *     description: |

 *       يُنشئ قفلاً على المعاملة لصالح الموظف الحالي حتى:

 *       - إكمال المهمة (`POST /tasks/{taskId}/complete`)، أو

 *       - إلغاء الاستلام (`POST /tasks/{taskId}/release`)

 *

 *       القفل **بدون مدة زمنية** — يبقى مفتوحاً حتى complete أو release.

 *     tags: [Workflow, Task Lock]

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

 *         description: تم استلام المعاملة بنجاح

 *       409:

 *         description: المعاملة مستلمة من موظف آخر — لا تُعاد تفاصيل المعاملة

 *         content:

 *           application/json:

 *             schema:

 *               $ref: '#/components/schemas/ApiErrorResponse'

 *             example:

 *               success: false

 *               status_code: 409

 *               message: هذه المعاملة قد تم استلامها من قبل موظف آخر

 *               error: TASK_LOCKED_BY_ANOTHER

 *               data: null

 */

router.post('/tasks/:taskId/pickup', authMiddleware, pickupTaskController)



/**

 * @swagger

 * /api/workflow/tasks/{taskId}/release:

 *   post:

 *     summary: إلغاء استلام المعاملة (release task lock)

 *     description: |

 *       يفك القفل عن المعاملة لصاحب القفل فقط.

 *       يُستخدم عند الضغط على «إلغاء الاستلام» في الواجهة.

 *     tags: [Workflow, Task Lock]

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

 *         description: تم إلغاء الاستلام بنجاح

 *       403:

 *         description: لست صاحب القفل

 *       409:

 *         description: لا يوجد قفل نشط

 */

router.post('/tasks/:taskId/release', authMiddleware, releaseTaskController)



/**

 * @swagger

 * /api/workflow/tasks/{taskId}/signing-challenge:

 *   post:

 *     summary: Create transaction signing challenge (USB private key)

 *     description: |

 *       **الخطوة 2** قبل `complete` — توقيع USB إلزامي دائماً لمهام المستخدم (لا يُتجاوز بـ `requires_digital_signature: false`).

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

 *       **تسلسل (توقيع USB إلزامي دائماً):** GET `/tasks/{taskId}` → POST `/signing-challenge` → وقّع `message` → POST `/complete`

 *

 *       **القالب (إلزامي):** `form_id`, `form_name`, `widgets[]` + `value`, `templates[]`, `decision`, `note`, `signature` — بدون `signature` يُرفض الطلب

 *

 *       **`assignments` (حسب المرحلة):** إذا `is_assignment=true` —

 *       أرسل `[{ organization_id, department_id, role_id }]`.

 *       يُطابق OrgDeptRole نشط ويُوجّه USER_TASK التالية.

 *       عند عدم التطابق: «لم يتم العثور على وظيفة مثل التي ارسلت».

 *       عند فشل التوجيه → fallback إلى stage_assignments للمرحلة التالية.

 *       إن `is_assignment=false` → التوجيه عبر stage_assignments للمرحلة التالية.

 *

  *       **عند الرفض (`decision = reject`):** `note` إلزامي — يُرسل إشعار لـ `transaction.user_id`:

 *       «لقد تم رفض معاملتك (اسم المعاملة) بسبب (note)» — Firebase للمواطن (CITIZEN)، WebSocket للموظف.

 *

 *       **`idempotency_key`:** يُولَّد من السيرفر — لا ترسله (يُعاد في `data.idempotency_key`)

 *

 *       **Response `data`:** `form_id`, `form_name`, `widgets`, `templates`, `variables.value`, `decision`, `workflow_status`, ...

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

 *             review_with_destination:

 *               $ref: '#/components/examples/CompleteTaskWithDestination'

 *             review:

 *               $ref: '#/components/examples/LeaveProcessReviewComplete'

 *             sign_pdf:

 *               $ref: '#/components/examples/LeaveProcessSignEduManagerComplete'

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

 *                 form_id: leave_process_review

 *                 form_name: التشيك على المعلومات المدخلة

 *                 stage_name: التشيك على المعلومات المدخلة

 *                 widgets:

 *                   - widget_type: radio_group

 *                     data:

 *                       id: decision

 *                       label: قرار الطلب

 *                     value: الطلب مقبول

 *                 templates: []

 *                 variables:

 *                   value: الطلب مقبول

 *                 gateway_value: الطلب مقبول

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

