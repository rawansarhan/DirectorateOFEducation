'use strict'

const { HTTP_STATUS } = require('../middleware/httpStatusCodes')

function formatJoiError (error) {
  if (!error?.details?.length) {
    return 'بيانات الطلب غير صالحة'
  }

  const lines = error.details.map((detail) => {
    const field = detail.path?.length ? detail.path.join('.') : 'body'
    const text =
      detail.context?.message ||
      detail.message ||
      'قيمة غير صالحة'

    return `${field}: ${text}`
  })

  return `بيانات الطلب غير صالحة — ${lines.join(' | ')}`
}

function joiErrorDetails (error) {
  if (!error?.details?.length) {
    return []
  }

  return error.details.map((detail) => ({
    field: detail.path?.length ? detail.path.join('.') : null,
    message:
      detail.context?.message ||
      detail.message ||
      'قيمة غير صالحة'
  }))
}

function formatSequelizeError (err) {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return 'سجل مكرر — قد تكون هذه العملية أو الكود موجوداً مسبقاً'
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return 'مرجع غير صالح (مؤسسة أو نوع معاملة غير موجود)'
  }

  const parentMsg = err.parent?.message || err.message || ''

  if (parentMsg.includes('process_definitions')) {
    return 'فشل حفظ العملية في قاعدة البيانات'
  }

  return parentMsg || 'خطأ في قاعدة البيانات'
}

function formatMulterError (err) {
  if (!err) {
    return null
  }

  if (err.message && err.name !== 'MulterError') {
    return err.message
  }

  switch (err.code) {
    case 'LIMIT_UNEXPECTED_FILE':
      return 'اسم حقل الملف يجب أن يكون "file"'
    case 'LIMIT_FILE_SIZE':
      return 'حجم الملف أكبر من الحد المسموح'
    case 'LIMIT_FILE_COUNT':
      return 'يُسمح برفع ملف واحد فقط'
    case 'LIMIT_PART_COUNT':
      return 'عدد حقول الطلب أكبر من المسموح'
    default:
      return err.message || 'فشل رفع ملف BPMN'
  }
}

function extractCamundaTaskIdFromMessage (message = '') {
  const match = String(message).match(/id\s+([a-f0-9-]{36})/i)
  return match?.[1] || null
}

function buildCamundaTaskNotFoundMessage (remoteMessage, action = 'إكمال المهمة') {
  const taskId = extractCamundaTaskIdFromMessage(remoteMessage)
  const actionVerb = String(action).includes('جلب') ? 'فتح' : 'إكمال'

  return [
    taskId
      ? `تعذّر ${actionVerb} المهمة في Camunda — المعرّف ${taskId} غير موجود في قائمة المهام النشطة.`
      : `تعذّر ${actionVerb} المهمة في Camunda — المهمة غير موجودة في قائمة المهام النشطة.`,
    '',
    'ما الذي يعنيه ذلك؟',
    'Camunda لا يجد User Task نشطة بهذا taskId. هذا ليس خطأ في templates أو التوقيع أو SERVICE TASK pdf في BPMN — إنشاء PDF يتم عبر GENERATE_PDF في stage_config بعد نجاح complete.',
    '',
    'الأسباب المحتملة:',
    '1) taskId في URL قديم — أعد GET /api/workflow/tasks/pending-pickup أو /in-progress وخذ taskId جديداً.',
    '2) المهمة اكتملت مسبقاً (complete ناجح سابق أو إكمال من موظف آخر) — لا تكرّر نفس الطلب.',
    '3) challenge_id من signing-challenge لمهمة قديمة — بعد تحديث taskId نادِ POST /tasks/{taskId}/signing-challenge من جديد.',
    '4) السير انتقل لمرحلة أخرى (Service Task مثل pdf أو User Task جديد) — راجع Camunda Cockpit → Active Activity.',
    '',
    'SERVICE TASK في BPMN بـ Expression ${true} صحيح في Camunda؛ لا يولّد PDF بنفسه — PDF يُنشأ في الباكند بعد إكمال User Task.'
  ].join('\n')
}

function appendCamundaTaskNotFoundDiagnostics (message, diagnostics) {
  if (!diagnostics?.history_task) {
    return message
  }

  const lines = [message, '', 'تشخيص من Camunda history:']
  const hist = diagnostics.history_task
  const isCompleted =
    Boolean(hist.completed_at) ||
    String(hist.state).toLowerCase() === 'completed'

  if (isCompleted) {
    lines.push(
      `• taskId ${diagnostics.requested_task_id} كان لمرحلة «${hist.name}» (${hist.task_definition_key}) ومُكتمل${hist.completed_at ? ` بتاريخ ${hist.completed_at}` : ''}.`
    )
  } else {
    lines.push(
      `• taskId ${diagnostics.requested_task_id} — «${hist.name}» (${hist.state}).`
    )
  }

  if (diagnostics.current_active_task) {
    const current = diagnostics.current_active_task
    lines.push(
      `• المهمة النشطة الحالية لنفس المعاملة: «${current.name}» — استخدم taskId: ${current.task_id}`
    )
  } else if (hist.process_instance_id) {
    lines.push(
      '• لا توجد User Task نشطة على نفس process instance (ربما Service Task أو انتهى السير).'
    )
  }

  return lines.join('\n')
}

async function enrichCamundaTaskNotFoundError (err, taskId, loadDiagnostics) {
  if (err?.code !== 'CAMUNDA_TASK_NOT_FOUND' || typeof loadDiagnostics !== 'function') {
    return err
  }

  const diagnostics = await loadDiagnostics(taskId)

  if (!diagnostics) {
    return err
  }

  err.details = {
    ...(err.details || {}),
    diagnostics
  }
  err.message = appendCamundaTaskNotFoundDiagnostics(err.message, diagnostics)

  return err
}

function buildCamundaTaskNotFoundDetails (remoteMessage, action = 'إكمال المهمة') {
  const taskId = extractCamundaTaskIdFromMessage(remoteMessage)

  return {
    task_id: taskId,
    camunda_action: action,
    failure_stage: 'camunda_runtime_task',
    not_caused_by: [
      'templates',
      'signature_payload',
      'service_task_bpmn_expression'
    ],
    likely_causes: [
      'taskId في URL قديم — المهمة لم تعد في Camunda runtime',
      'المهمة اكتملت مسبقاً (طلب مكرر أو إكمال موازٍ)',
      'challenge_id مرتبط بمهمة مختلفة عن taskId في URL',
      'سير العمل انتقل لمرحلة Service Task أو User Task أخرى'
    ],
    next_steps: [
      'GET /api/workflow/tasks/pending-pickup أو /in-progress',
      'POST /api/workflow/tasks/{taskId}/signing-challenge (إن لزم التوقيع)',
      'POST /api/workflow/tasks/{taskId}/complete مع taskId و challenge_id الجديدين'
    ]
  }
}

const CAMUNDA_ERROR_PATTERNS = [
  {
    test: (message) => message.includes('ENGINE-02004'),
    message:
      'لم يُحدد مسار سير العمل في Camunda — تأكد أن variables.decision يطابق شروط الـ gateway في BPMN المنشور (مثلاً: "الطلب مقبول" / "الطلب مرفوض" أو over_50 / under_50). decision في الجذر للتوقيع USB فقط.',
    code: 'CAMUNDA_GATEWAY_ERROR',
    status: HTTP_STATUS.BAD_REQUEST
  },
  {
    test: (message) =>
      /No matching task with id/i.test(message) ||
      /Cannot complete task .+ does not exist/i.test(message) ||
      /Cannot find task with id/i.test(message) ||
      /task .+ was not found/i.test(message),
    buildMessage: buildCamundaTaskNotFoundMessage,
    buildDetails: buildCamundaTaskNotFoundDetails,
    code: 'CAMUNDA_TASK_NOT_FOUND',
    status: HTTP_STATUS.NOT_FOUND
  },
  {
    test: (message) => message.includes('ENGINE-03005'),
    message: 'المهمة مقفلة أو غير متاحة للإكمال — حاول claim أو افتح GET /tasks/{taskId}',
    code: 'CAMUNDA_TASK_LOCKED',
    status: HTTP_STATUS.CONFLICT
  },
  {
    test: (message) => message.includes('ECONNREFUSED') || message.includes('ENOTFOUND'),
    message: 'تعذّر الاتصال بـ Camunda — تأكد أن الخدمة تعمل وأن CAMUNDA_URL صحيح',
    code: 'CAMUNDA_UNAVAILABLE',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR
  }
]

function matchCamundaErrorPattern (message = '') {
  const text = String(message)

  for (const pattern of CAMUNDA_ERROR_PATTERNS) {
    if (pattern.test(text)) {
      return pattern
    }
  }

  return null
}

function extractAxiosRemoteMessage (err) {
  const data = err?.response?.data

  if (typeof data === 'string' && data.trim()) {
    return data.trim()
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim()
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error.trim()
  }

  return null
}

function isCamundaAxiosError (err) {
  const url = String(err?.config?.url || '')

  return url.includes('/engine-rest/')
}

function isInternalTransactionAxiosError (err) {
  return String(err?.config?.url || '').includes('/internal/transactions/')
}

function formatInternalTransactionError (err) {
  const remote = extractAxiosRemoteMessage(err)
  const status = err?.response?.status

  if (status === 409 || remote?.includes('موظف آخر')) {
    return {
      message: remote || 'تعارض في إصدار المعاملة — أعد تحميل GET /tasks/{taskId} وأرسل expected_version',
      code: 'VERSION_CONFLICT',
      status: HTTP_STATUS.CONFLICT
    }
  }

  if (status === 404) {
    return {
      message: 'المعاملة غير موجودة',
      code: 'TRANSACTION_NOT_FOUND',
      status: HTTP_STATUS.NOT_FOUND
    }
  }

  if (remote) {
    return {
      message: remote,
      code: 'TRANSACTION_UPDATE_ERROR',
      status: status && status < 500 ? status : HTTP_STATUS.BAD_REQUEST
    }
  }

  return {
    message: 'فشل تحديث بيانات المعاملة — أعد المحاولة',
    code: 'TRANSACTION_UPDATE_ERROR',
    status: HTTP_STATUS.BAD_REQUEST
  }
}

function resolveCamundaPatternMessage (pattern, remoteMessage, action) {
  if (typeof pattern.buildMessage === 'function') {
    return pattern.buildMessage(remoteMessage, action)
  }

  return pattern.message
}

function formatCamundaError (err, action = 'تنفيذ العملية') {
  const remote = extractAxiosRemoteMessage(err)
  const matched = remote ? matchCamundaErrorPattern(remote) : null

  if (matched) {
    return resolveCamundaPatternMessage(matched, remote, action)
  }

  if (remote) {
    return `Camunda — ${action}: ${remote}`
  }

  if (Array.isArray(err?.response?.data?.details) && err.response.data.details.length) {
    const detailText = err.response.data.details
      .map((item) => item.message || item.description)
      .filter(Boolean)
      .join(' — ')

    if (detailText) {
      return `Camunda — ${action}: ${detailText}`
    }
  }

  if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
    return 'تعذّر الاتصال بخدمة Camunda — تأكد أن Camunda يعمل وأن CAMUNDA_URL صحيح'
  }

  if (err?.message && !/^Request failed with status code \d+$/.test(err.message)) {
    return `فشل ${action} على Camunda: ${err.message}`
  }

  return `فشل ${action} على Camunda — تحقق من حالة المهمة ومتغيرات variables.decision`
}

function enrichAxiosErrorForWorkflow (err, action = 'إكمال المهمة') {
  if (!err?.isAxiosError) {
    return null
  }

  const remote = extractAxiosRemoteMessage(err)

  if (isCamundaAxiosError(err)) {
    const matched = remote ? matchCamundaErrorPattern(remote) : null

    if (matched) {
      const enriched = {
        message: resolveCamundaPatternMessage(matched, remote, action),
        code: matched.code,
        status: matched.status
      }

      if (typeof matched.buildDetails === 'function') {
        enriched.details = matched.buildDetails(remote, action)
      }

      return enriched
    }

    return {
      message: formatCamundaError(err, action),
      code: err.response?.data?.type === 'RestException' ? 'CAMUNDA_ERROR' : 'CAMUNDA_ERROR',
      status:
        err.response?.status && err.response.status < 500
          ? err.response.status
          : HTTP_STATUS.BAD_REQUEST
    }
  }

  if (isInternalTransactionAxiosError(err)) {
    return formatInternalTransactionError(err)
  }

  if (remote) {
    return {
      message: remote,
      code: 'EXTERNAL_SERVICE_ERROR',
      status:
        err.response?.status && err.response.status < 500
          ? err.response.status
          : HTTP_STATUS.BAD_REQUEST
    }
  }

  if (err.code === 'ECONNREFUSED') {
    return {
      message: 'تعذّر الاتصال بخدمة داخلية — تحقق أن السيرفر يعمل',
      code: 'SERVICE_UNAVAILABLE',
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR
    }
  }

  if (/^Request failed with status code \d+$/.test(String(err.message))) {
    const status = err.response?.status || 500

    return {
      message:
        status >= 500
          ? 'حدث خطأ في خدمة خارجية — راجع سجلات السيرفر'
          : `فشل الطلب (${status}) — تحقق من البيانات المرسلة`,
      code: status >= 500 ? 'EXTERNAL_SERVICE_ERROR' : 'REQUEST_ERROR',
      status: status >= 500 ? HTTP_STATUS.INTERNAL_SERVER_ERROR : HTTP_STATUS.BAD_REQUEST
    }
  }

  return null
}

function createExposedError ({
  message,
  code,
  statusCode = HTTP_STATUS.BAD_REQUEST,
  details = null
}) {
  const error = new Error(message)
  error.code = code
  error.statusCode = statusCode
  error.expose = true

  if (details && typeof details === 'object') {
    error.details = details
  }

  return error
}

function rethrowAxiosAsWorkflowError (err, action = 'تنفيذ العملية') {
  if (!err?.isAxiosError) {
    throw err
  }

  const enriched = enrichAxiosErrorForWorkflow(err, action)

  if (enriched) {
    throw createExposedError({
      message: enriched.message,
      code: enriched.code,
      statusCode: enriched.status,
      details: enriched.details
    })
  }

  throw createExposedError({
    message: formatCamundaError(err, action),
    code: 'EXTERNAL_SERVICE_ERROR',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
  })
}

function formatClientErrorMessage (err) {
  if (!err) {
    return null
  }

  if (err?.expose && err.message) {
    return err.message
  }

  if (
    err?.statusCode &&
    err.statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR &&
    err.message
  ) {
    return err.message
  }

  if (err?.code === 'VALIDATION_ERROR' && err.message) {
    return err.message
  }

  if (err.name === 'MulterError' || (err.message && err.code?.startsWith?.('LIMIT_'))) {
    return formatMulterError(err)
  }

  if (err.name === 'SequelizeValidationError' && err.errors?.length) {
    return err.errors.map((e) => e.message).join(' — ')
  }

  if (
    err.name === 'SequelizeUniqueConstraintError' ||
    err.name === 'SequelizeForeignKeyConstraintError' ||
    err.name === 'SequelizeDatabaseError'
  ) {
    return formatSequelizeError(err)
  }

  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return 'صيغة JSON في الطلب غير صحيحة — تحقق من الأقواس والفواصل'
  }

  if (err.isAxiosError) {
    const enriched = enrichAxiosErrorForWorkflow(err)

    if (enriched?.message) {
      return enriched.message
    }

    const remote = extractAxiosRemoteMessage(err)

    if (typeof remote === 'string' && remote.trim()) {
      if (isCamundaAxiosError(err)) {
        return formatCamundaError(err)
      }

      return remote
    }

    if (isCamundaAxiosError(err)) {
      return formatCamundaError(err)
    }

    if (err.code === 'ECONNREFUSED') {
      return 'تعذّر الاتصال بخدمة خارجية — تحقق من Camunda أو السيرفر الداخلي'
    }

    if (/^Request failed with status code \d+$/.test(String(err.message))) {
      return err.response?.status >= 500
        ? 'حدث خطأ في خدمة خارجية — راجع سجلات السيرفر'
        : 'فشل الطلب — تحقق من البيانات المرسلة'
    }

    return err.message || 'تعذّر الاتصال بخدمة خارجية'
  }

  return err.message || null
}

function buildErrorPayload (err) {
  const message =
    formatClientErrorMessage(err) ||
    'حدث خطأ أثناء معالجة الطلب'

  const payload = {
    message,
    code: err?.code || err?.name || 'REQUEST_ERROR'
  }

  if (Array.isArray(err?.details) && err.details.length) {
    payload.details = err.details
  }

  return payload
}

module.exports = {
  formatJoiError,
  joiErrorDetails,
  formatSequelizeError,
  formatMulterError,
  formatCamundaError,
  formatClientErrorMessage,
  buildErrorPayload,
  enrichAxiosErrorForWorkflow,
  rethrowAxiosAsWorkflowError,
  createExposedError,
  matchCamundaErrorPattern,
  extractAxiosRemoteMessage,
  buildCamundaTaskNotFoundMessage,
  buildCamundaTaskNotFoundDetails,
  extractCamundaTaskIdFromMessage,
  appendCamundaTaskNotFoundDiagnostics,
  enrichCamundaTaskNotFoundError
}
