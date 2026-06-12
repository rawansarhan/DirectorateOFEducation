'use strict'

const processRepository = require('../../../workflow/processDefinition/repositories/processRepository')
const { buildTransactionIdProcess } = require('../utils/transactionIdProcess')

async function ensureTransactionIdProcess (transaction, { transaction: dbTransaction } = {}) {
  if (!transaction) {
    return null
  }

  if (transaction.id_process) {
    return transaction.id_process
  }

  const process = transaction.code
    ? await processRepository.findByCodeWithType(transaction.code)
    : null

  const idProcess = buildTransactionIdProcess({
    typeTransCode: process?.type_trans?.code || 'TXN',
    transactionId: transaction.id,
    createdAt: transaction.created_at
  })

  await transaction.update({ id_process: idProcess }, { transaction: dbTransaction })

  return idProcess
}

module.exports = {
  ensureTransactionIdProcess,
  buildTransactionIdProcess
}
