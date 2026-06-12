'use strict'

const { sendAndPersistNotification } = require('./notificationService')

async function notifyTransactionOwnerOnReject ({
  transaction,
  stage,
  note = '',
  rejectionReason = '',
  processInstanceId = null,
  sentByUserId = null
}) {
  const userId = transaction?.user_id

  const idProcess = transaction.id_process || ''
  const reference = idProcess || String(transaction?.id || '')
  const trimmedNote = String(note || '').trim()
  const trimmedReason = String(rejectionReason || '').trim()
  const employeeMessage = trimmedNote || trimmedReason

  const message = employeeMessage
    ? `تم رفض معاملتك (${reference}). ${employeeMessage}`
    : `تم رفض معاملتك (${reference}).`

  return sendAndPersistNotification({
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
      idProcess,
      stageCode: stage?.code || '',
      stageName: stage?.name || '',
      note: trimmedNote,
      rejectionReason: trimmedReason,
      processInstanceId: String(processInstanceId || '')
    }
  })
}

module.exports = {
  notifyTransactionOwnerOnReject
}
