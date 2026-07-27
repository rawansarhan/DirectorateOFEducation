'use strict'

/**
 * عند فشل تقني أثناء سير المعاملة (مثلاً complete task):
 * - رفض المعاملة + إلغاء process instance في Camunda
 * - إشعار: صاحب المعاملة، الموظف المنفّذ، المسؤول التقني
 */

const sequelize = require('../../../core/config/database')
const camundaClient = require('../../../core/shared/clients/camunda/camundaClient')
const transactionRepository = require('../../transaction/transaction/repositories/transactionRepository')
const processRepository = require('../../workflow/processDefinition/repositories/processRepository')
const processInstanceRepository = require('../../workflow/taskCamunda/repositories/processInstanceRepository')
const {
  findActiveUserIdsByRoleCode
} = require('../repositories/notificationRecipientRepository')
const { deliverNotificationToUser } = require('./notificationDeliveryService')

const TECHNICAL_OFFICER_ROLE = 'TECHNICAL_OFFICER'

const OWNER_EMPLOYEE_MESSAGE = 'تم رفض المعاملة بسبب خلل تقني'

/** أخطاء عميل / أعمال — لا تُرفض المعاملة تلقائياً */
const NON_TECHNICAL_ERROR_CODES = new Set([
  'VALIDATION_ERROR',
  'SIGNATURE_REQUIRED',
  'SIGNATURE_INVALID',
  'VERSION_CONFLICT',
  'IDEMPOTENT_REPLAY',
  // جاهزية PDF/الوثيقة تعالجها retry/outbox وليست سبب رفض فوري
  'GENERATE_PDF_NOT_READY',
  'FINAL_DOCUMENT_NOT_READY',
  'FORBIDDEN',
  'UNAUTHORIZED',
  'TASK_LOCKED_BY_ANOTHER',
  'TASK_LOCK_EXPIRED',
  'TASK_LOCK_REQUIRED',
  'TASK_LOCK_NOT_HELD',
  'TASK_LOCK_NOT_OWNER',
  'TASK_NOT_FOUND',
  'NOT_FOUND'
])

function isTechnicalWorkflowError (error) {
  if (!error) {
    return false
  }

  const code = String(error.code || '').trim()

  if (code && NON_TECHNICAL_ERROR_CODES.has(code)) {
    return false
  }

  if (code.startsWith('TASK_LOCK')) {
    return false
  }

  const status = Number(error.statusCode || error.status || 0)

  if (status === 401 || status === 403) {
    return false
  }

  // 400 مع كود تحقق صريح فقط يُستثنى أعلاه؛ باقي 400 التقنية (مثل DB) تُرفض
  return true
}

function resolveErrorMessage (error) {
  if (!error) {
    return 'خطأ تقني غير معروف'
  }

  const message = String(error.message || error || '').trim()
  return message || 'خطأ تقني غير معروف'
}

async function resolveContextFromTaskId (taskId) {
  if (!taskId) {
    return null
  }

  let camundaProcessInstanceId = null

  try {
    const task = await camundaClient.getTaskById(taskId)
    camundaProcessInstanceId = task?.processInstanceId || null
  } catch (_) {
    // المهمة قد تكون اكتملت/اختفت — نحاول عبر التشخيص إن وُجد لاحقاً
  }

  if (!camundaProcessInstanceId) {
    return null
  }

  const processInstance = await processInstanceRepository.findByCamundaId(
    camundaProcessInstanceId
  )

  if (!processInstance?.transaction_id) {
    return null
  }

  const transaction = await transactionRepository.findById(
    processInstance.transaction_id
  )

  if (!transaction) {
    return null
  }

  return { transaction, processInstance }
}

async function rejectTransactionForTechnicalFailure ({
  transaction,
  processInstance,
  errorMessage,
  actorUserId = null,
  taskId = null
}) {
  const transactionData = {
    ...(transaction.data || {}),
    _workflow_technical_failure: {
      handled: true,
      at: new Date().toISOString(),
      reason: errorMessage || null,
      actor_user_id: actorUserId || null,
      task_id: taskId || null
    }
  }

  if (
    processInstance?.camunda_process_instance_id &&
    processInstance.status !== 'cancelled'
  ) {
    try {
      await camundaClient.deleteProcessInstance(
        processInstance.camunda_process_instance_id
      )
    } catch (_) {}
  }

  await sequelize.transaction(async dbTx => {
    const fresh = await transactionRepository.findById(transaction.id, dbTx)

    if (!fresh || fresh.status === 'rejected' || fresh.status === 'completed') {
      return
    }

    if (processInstance) {
      await processInstanceRepository.update(
        processInstance.id,
        {
          status: 'cancelled',
          current_stage_id: null,
          task_lock_user_id: null,
          task_lock_task_id: null,
          task_locked_at: null,
          task_lock_expires_at: null,
          task_locks: {}
        },
        dbTx
      )
    }

    await transactionRepository.updateStatus(fresh.id, 'rejected', dbTx)

    try {
      await transactionRepository.updateDataOptimistic(
        fresh.id,
        transactionData,
        fresh.version,
        dbTx
      )
    } catch (_) {
      // رفض الحالة أهم من تحديث data عند تعارض الإصدار
    }
  })
}

async function notifyTechnicalFailureParties ({
  transaction,
  processName,
  processInstanceId = null,
  actorUserId = null,
  errorMessage
}) {
  const baseData = {
    type: 'workflow_technical_failure',
    transactionId: String(transaction.id),
    idProcess: transaction.id_process || '',
    processName,
    error: errorMessage || ''
  }

  const notified = new Set()
  const deliveries = []

  async function notifyOnce ({ userId, title, message, audience }) {
    const id = Number(userId)

    if (!Number.isInteger(id) || id < 1 || notified.has(id)) {
      return
    }

    notified.add(id)

    deliveries.push(
      await deliverNotificationToUser({
        userId: id,
        title,
        message,
        type: 'workflow_technical_failure',
        transactionId: transaction.id,
        processInstanceId,
        data: {
          ...baseData,
          audience
        }
      })
    )
  }

  await notifyOnce({
    userId: transaction.user_id,
    title: 'تم رفض المعاملة',
    message: OWNER_EMPLOYEE_MESSAGE,
    audience: 'transaction_owner'
  })

  if (actorUserId) {
    await notifyOnce({
      userId: actorUserId,
      title: 'تم رفض المعاملة',
      message: OWNER_EMPLOYEE_MESSAGE,
      audience: 'acting_employee'
    })
  }

  const technicalOfficerIds = await findActiveUserIdsByRoleCode(
    TECHNICAL_OFFICER_ROLE
  )

  const techMessage =
    `لقد تم فشل المعاملة (${processName}) بسبب (${errorMessage || 'خلل تقني'})`

  for (const officerId of technicalOfficerIds) {
    await notifyOnce({
      userId: officerId,
      title: 'فشل تقني في معاملة',
      message: techMessage,
      audience: 'technical_officer'
    })
  }

  return deliveries
}

/**
 * يُستدعى عند خطأ تقني أثناء complete / سير المعاملة.
 * لا يرمي أخطاء للأعلى — يُسجّل فقط إن فشل المعالج نفسه.
 */
async function handleWorkflowTechnicalFailure ({
  taskId = null,
  actorUserId = null,
  error = null,
  transaction = null,
  processInstance = null
} = {}) {
  if (!isTechnicalWorkflowError(error)) {
    return { handled: false, reason: 'non_technical_error' }
  }

  const errorMessage = resolveErrorMessage(error)

  let tx = transaction
  let pi = processInstance

  if (!tx || !pi) {
    const resolved = await resolveContextFromTaskId(taskId)

    if (!tx) {
      tx = resolved?.transaction || null
    }

    if (!pi) {
      pi = resolved?.processInstance || null
    }
  }

  if (!tx && pi?.transaction_id) {
    tx = await transactionRepository.findById(pi.transaction_id)
  }

  if (!tx) {
    return { handled: false, reason: 'transaction_not_found' }
  }

  if (
    tx.status === 'rejected' ||
    tx.data?._workflow_technical_failure?.handled ||
    tx.data?._generate_pdf_rejection?.handled
  ) {
    return { handled: false, reason: 'already_rejected' }
  }

  if (!pi) {
    pi = await processInstanceRepository.findByTransactionId(tx.id)
  }

  const process = tx.code
    ? await processRepository.findByCode(tx.code)
    : null

  const processName =
    process?.name ||
    pi?.process_definition?.name ||
    tx.id_process ||
    tx.code ||
    `معاملة #${tx.id}`

  await rejectTransactionForTechnicalFailure({
    transaction: tx,
    processInstance: pi,
    errorMessage,
    actorUserId,
    taskId
  })

  const deliveries = await notifyTechnicalFailureParties({
    transaction: tx,
    processName,
    processInstanceId: pi?.id || null,
    actorUserId,
    errorMessage
  })

  console.log('[WorkflowTechnicalFailure] rejected + notifications sent', {
    transactionId: tx.id,
    taskId,
    actorUserId,
    recipients: deliveries.length,
    error: errorMessage
  })

  return {
    handled: true,
    transaction_id: tx.id,
    recipients: deliveries.length
  }
}

module.exports = {
  isTechnicalWorkflowError,
  handleWorkflowTechnicalFailure,
  OWNER_EMPLOYEE_MESSAGE
}
