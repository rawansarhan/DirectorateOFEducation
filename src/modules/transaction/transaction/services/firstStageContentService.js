'use strict'

const transactionRepository = require('../repositories/transactionRepository')
const {
  processRepository,
  stageRepository,
  buildHistoryStageEntry
} = require('../../../workflow/public')
const {
  parsePositiveInt
} = require('../validations/transactionValidations')
const {
  createTransactionError
} = require('../utils/transactionErrors')

const APPLICANT_STAGE_KEYS = new Set([
  'stage_name',
  'form_id',
  'form_name',
  'widgets',
  'templates',
  'decision',
  'note',
  'completed_by',
  'completed_at'
])

function hasApplicantStagePayload (data = {}) {
  return Boolean(
    data.form_id ||
    (Array.isArray(data.widgets) && data.widgets.length) ||
    (Array.isArray(data.templates) && data.templates.length)
  )
}

function isOwnedApplicantSubmission (data = {}, userId) {
  if (!hasApplicantStagePayload(data)) {
    return false
  }

  if (data.completed_by == null) {
    return false
  }

  return Number(data.completed_by) === Number(userId)
}

function resolveApplicantSubmissionRaw (transactionData = {}, authStage = null, userId) {
  const data = transactionData || {}

  if (isOwnedApplicantSubmission(data, userId)) {
    return data
  }

  const stageCode = authStage?.code

  if (
    stageCode &&
    data[stageCode] &&
    typeof data[stageCode] === 'object' &&
    isOwnedApplicantSubmission(data[stageCode], userId)
  ) {
    return data[stageCode]
  }

  return null
}

function buildApplicantSubmissionContent (rawStageData = {}) {
  const content = {}

  for (const key of APPLICANT_STAGE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(rawStageData, key)) {
      continue
    }

    content[key] = rawStageData[key]
  }

  return buildHistoryStageEntry(content)
}

/**
 * يعرض للمستخدم (مقدم الطلب) محتوى مرحلة AUTH الأولى
 * كما سُجّل في transaction.data — فقط إذا completed_by = user_id المصادق.
 */
async function getFirstStageContentByTransactionId (transactionId, userId) {
  const numericId = parsePositiveInt(transactionId, 'معرّف المعاملة')
  const transaction = await transactionRepository.findById(numericId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  if (transaction.user_id !== userId) {
    throw createTransactionError('UNAUTHORIZED')
  }

  if (!transaction.code) {
    throw createTransactionError(
      'VALIDATION_ERROR',
      'المعاملة غير مرتبطة بعملية — لا يمكن تحديد مرحلة التقديم'
    )
  }

  const process = await processRepository.findByCode(transaction.code)

  if (!process) {
    throw createTransactionError('PROCESS_NOT_FOUND')
  }

  const authStage = await stageRepository.findFirstAuthStage(process.id)

  if (!authStage) {
    throw createTransactionError(
      'FIRST_STAGE_NOT_FOUND',
      'لا توجد مرحلة تقديم (AUTH) لهذه العملية'
    )
  }

  const rawSubmission = resolveApplicantSubmissionRaw(
    transaction.data,
    authStage,
    userId
  )

  if (!rawSubmission) {
    throw createTransactionError(
      'FIRST_STAGE_CONTENT_NOT_FOUND',
      'لا يوجد طلب مقدّم محفوظ لهذه المعاملة بعد'
    )
  }

  return {
    transaction_id: transaction.id,
    stage_code: authStage.code,
    stage_name: authStage.name,
    auth_type: authStage.auth_type,
    completed_by: Number(rawSubmission.completed_by),
    content: buildApplicantSubmissionContent(rawSubmission)
  }
}

module.exports = {
  getFirstStageContentByTransactionId
}
