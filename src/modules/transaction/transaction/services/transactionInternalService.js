'use strict'

const repo = require('../repositories/transactionRepository')
const { toDTO } = require('../mappers/transactionMapper')

async function getById (id) {
  const transaction = await repo.findById(id)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  return toDTO(transaction)
}

async function updateStatus (id, status) {
  const transaction = await repo.findById(id)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  await transaction.update({ status })

  return toDTO(transaction)
}

async function updateData (id, data, expectedVersion = null) {
  const transaction = await repo.findById(id)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (expectedVersion != null) {
    const updated = await repo.updateDataOptimistic(id, data, expectedVersion)
    return toDTO(updated)
  }

  await transaction.update({
    data: {
      ...transaction.data,
      ...data
    }
  })

  return toDTO(transaction)
}

module.exports = {
  updateData,
  updateStatus,
  getById
}
