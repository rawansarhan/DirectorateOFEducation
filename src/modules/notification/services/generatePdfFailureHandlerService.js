'use strict'

const sequelize = require('../../../core/config/database')
const camundaClient = require('../../../core/shared/clients/camunda/camundaClient')
const transactionRepository = require('../../transaction/transaction/repositories/transactionRepository')
const processRepository = require('../../workflow/processDefinition/repositories/processRepository')
const stageRepository = require('../../workflow/processDefinition/repositories/stageRepository')
const processInstanceRepository = require('../../workflow/taskCamunda/repositories/processInstanceRepository')
const {
  findActiveUserIdsByRoleCode
} = require('../repositories/notificationRecipientRepository')
const { deliverNotificationToUser } = require('./notificationDeliveryService')

const TECHNICAL_OFFICER_ROLE = 'TECHNICAL_OFFICER'
const APPLICANT_MESSAGE =
  'تم رفض المعاملة بسبب خطأ تقني اعد الطلب رجاء'

function templateMatchesId (entry, templateId) {
  const rawId = entry?.id_template ?? entry?.id ?? entry?.template_id
  return Number(rawId) === Number(templateId)
}

function stageHasTemplate (stageData, templateId) {
  if (!stageData || typeof stageData !== 'object') {
    return false
  }

  const templates = Array.isArray(stageData.templates) ? stageData.templates : []
  return templates.some(entry => templateMatchesId(entry, templateId))
}

function findTemplateFillerUserId (transactionData = {}, templateId) {
  const data = transactionData || {}

  if (stageHasTemplate(data, templateId) && data.completed_by != null) {
    return Number(data.completed_by)
  }

  for (const value of Object.values(data)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue
    }

    if (stageHasTemplate(value, templateId) && value.completed_by != null) {
      return Number(value.completed_by)
    }
  }

  return null
}

async function resolveStage ({ processId, stageCode }) {
  if (!processId || !stageCode) {
    return null
  }

  return stageRepository.findByCodeAndProcess(processId, stageCode)
}

async function rejectTransactionForGeneratePdfFailure ({
  transaction,
  processInstance,
  errorMessage
}) {
  const transactionData = {
    ...(transaction.data || {}),
    _generate_pdf_rejection: {
      handled: true,
      at: new Date().toISOString(),
      reason: errorMessage || null
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

    if (!fresh || fresh.status === 'rejected') {
      return
    }

    if (processInstance) {
      await processInstanceRepository.update(
        processInstance.id,
        {
          status: 'cancelled',
          current_stage_id: null
        },
        dbTx
      )
    }

    await transactionRepository.updateStatus(fresh.id, 'rejected', dbTx)
    await transactionRepository.updateDataOptimistic(
      fresh.id,
      transactionData,
      fresh.version,
      dbTx
    )
  })
}

async function notifyParties ({
  transaction,
  processName,
  stageName,
  templateId,
  stageCode,
  processInstanceId,
  errorMessage
}) {
  const baseData = {
    type: 'generate_pdf_failed',
    transactionId: String(transaction.id),
    idProcess: transaction.id_process || '',
    processName,
    stageCode: stageCode || '',
    stageName,
    templateId: String(templateId || ''),
    error: errorMessage || ''
  }

  const deliveries = []

  deliveries.push(
    await deliverNotificationToUser({
      userId: transaction.user_id,
      title: 'تم رفض المعاملة',
      message: APPLICANT_MESSAGE,
      type: 'generate_pdf_failed',
      transactionId: transaction.id,
      processInstanceId,
      data: {
        ...baseData,
        audience: 'transaction_owner'
      }
    })
  )

  const templateFillerId = findTemplateFillerUserId(transaction.data, templateId)

  if (
    templateFillerId &&
    templateFillerId !== Number(transaction.user_id)
  ) {
    deliveries.push(
      await deliverNotificationToUser({
        userId: templateFillerId,
        title: 'تم رفض المعاملة',
        message: `لقد تم رفض المعاملة (${processName}) بسبب خطأ في بنية القالب`,
        type: 'generate_pdf_template_failed',
        transactionId: transaction.id,
        processInstanceId,
        data: {
          ...baseData,
          audience: 'template_filler'
        }
      })
    )
  }

  const technicalOfficerIds = await findActiveUserIdsByRoleCode(
    TECHNICAL_OFFICER_ROLE
  )

  for (const officerId of technicalOfficerIds) {
    deliveries.push(
      await deliverNotificationToUser({
        userId: officerId,
        title: 'خطأ في إنشاء القالب',
        message:
          `لقد حدث خطأ في انشأ التيمبلت في المعاملة (${processName}) ` +
          `في المرحلة (${stageName})`,
        type: 'generate_pdf_technical_alert',
        transactionId: transaction.id,
        processInstanceId,
        data: {
          ...baseData,
          audience: 'technical_officer'
        }
      })
    )
  }

  return deliveries
}

/**
 * يُستدعى عند استنفاد محاولات GENERATE_PDF في outbox:
 * - يرفض المعاملة (transactions.status = rejected)
 * - يُشعر مقدم الطلب، مُعبّي القالب، والمسؤول التقني
 */
async function handleGeneratePdfFailure (payload = {}, error = null) {
  const transactionId = Number(payload.transaction_id)
  const templateId = Number(payload.template_id)
  const stageCode = payload.stage_code || null
  const errorMessage = error?.message || String(error || '')

  if (!Number.isInteger(transactionId) || transactionId < 1) {
    return { handled: false, reason: 'invalid_transaction_id' }
  }

  const transaction = await transactionRepository.findById(transactionId)

  if (!transaction) {
    return { handled: false, reason: 'transaction_not_found' }
  }

  if (
    transaction.status === 'rejected' ||
    transaction.data?._generate_pdf_rejection?.handled
  ) {
    return { handled: false, reason: 'already_rejected' }
  }

  const process = transaction.code
    ? await processRepository.findByCode(transaction.code)
    : null

  const processName = process?.name || transaction.code || 'معاملة'
  const stage = await resolveStage({
    processId: process?.id,
    stageCode
  })
  const stageName = stage?.name || stageCode || 'غير محددة'
  const processInstance =
    await processInstanceRepository.findByTransactionId(transactionId)

  await rejectTransactionForGeneratePdfFailure({
    transaction,
    processInstance,
    errorMessage
  })

  const deliveries = await notifyParties({
    transaction,
    processName,
    stageName,
    templateId,
    stageCode,
    processInstanceId: processInstance?.id || null,
    errorMessage
  })

  console.log('[GeneratePdfFailure] transaction rejected + notifications sent', {
    transactionId,
    templateId,
    stageCode,
    recipients: deliveries.length
  })

  return {
    handled: true,
    transaction_id: transactionId,
    recipients: deliveries.length
  }
}

module.exports = {
  findTemplateFillerUserId,
  handleGeneratePdfFailure
}
