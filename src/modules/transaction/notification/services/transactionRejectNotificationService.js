'use strict'

const processRepository = require('../../../workflow/processDefinition/repositories/processRepository')
const { deliverNotificationToUser } = require('./notificationDeliveryService')
// 
async function resolveProcessName ({
  transaction,
  processDefinitionId = null,
  processName = null
}) {
  if (processName) {
    return processName
  }

  if (processDefinitionId) {
    const process = await processRepository.findById(processDefinitionId)

    if (process?.name) {
      return process.name
    }
  }

  return transaction?.id_process || String(transaction?.id || '')
}

async function notifyTransactionOwnerOnReject ({
  transaction,
  stage,
  note = '',
  processDefinitionId = null,
  processName = null,
  processInstanceId = null,
  sentByUserId = null
}) {
  const userId = transaction?.user_id
  const trimmedNote = String(note || '').trim()
  const resolvedProcessName = await resolveProcessName({
    transaction,
    processDefinitionId,
    processName
  })

  const message = `لقد تم رفض معاملتك (${resolvedProcessName}) بسبب (${trimmedNote})`

  return deliverNotificationToUser({
    userId,
    sentByUserId,
    title: 'تم رفض المعاملة',
    message,
    type: 'transaction_rejected',
    transactionId: transaction?.id || null,
    processInstanceId,
    data: {
      type: 'transaction_rejected',
      transactionId: String(transaction?.id || ''),
      processName: resolvedProcessName,
      idProcess: transaction.id_process || '',
      stageCode: stage?.code || '',
      stageName: stage?.name || '',
      note: trimmedNote,
      processInstanceId: String(processInstanceId || '')
    }
  })
}

module.exports = {
  notifyTransactionOwnerOnReject
}
