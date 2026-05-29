const repo = require('../repositories/transactionRepository')


async function getById(id) {

  const transaction =
    await repo.findById(id)

  if (!transaction) {
    throw new Error(
      'Transaction not found'
    )
  }

  return transaction
}

// =====================================
// UPDATE STATUS
// =====================================

async function updateStatus(
  id,
  status
) {

  const transaction =
    await repo.findById(id)

  if (!transaction) {
    throw new Error(
      'Transaction not found'
    )
  }

  await transaction.update({
    status
  })

  return transaction
}

// =====================================
// UPDATE DATA
// =====================================

async function updateData(
  id,
  data,
  expectedVersion = null
) {

  const transaction =
    await repo.findById(id)

  if (!transaction) {
    throw new Error(
      'Transaction not found'
    )
  }

  if (expectedVersion != null) {
    return repo.updateDataOptimistic(id, data, expectedVersion)
  }

  await transaction.update({
    data: {
      ...transaction.data,
      ...data
    }
  })

  return transaction
}

module.exports = {
    updateData,
    updateStatus,
    getById
}