const { Transaction } = require('../../../entities')

async function findDraft(typeTransId) {
  return Transaction.findOne({
    where: {
      id: typeTransId,
      status: 'draft'
    },
    order: [['created_at', 'DESC']]
  })
}

async function findDraftByCode(
  userId,
  code
) {

  return Transaction.findOne({

    where: {
      user_id: userId,
      code,
      status: 'draft'
    },

    order: [['created_at', 'DESC']]
  })
}

async function create(data) {
  return Transaction.create(data)
}

async function findById(id) {
  return Transaction.findByPk(id)
}

async function updateDataOptimistic (id, data, expectedVersion) {
  const transaction = await Transaction.findByPk(id)

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  if (transaction.version !== expectedVersion) {
    const error = new Error(
      'تم تعديل المعاملة من موظف آخر. أعد تحميل التفاصيل وحاول مجدداً.'
    )
    error.code = 'VERSION_CONFLICT'
    error.currentVersion = transaction.version
    error.expectedVersion = expectedVersion
    throw error
  }

  const [affectedRows] = await Transaction.update(
    {
      data,
      version: expectedVersion + 1
    },
    {
      where: {
        id,
        version: expectedVersion
      }
    }
  )

  if (!affectedRows) {
    const error = new Error(
      'تم تعديل المعاملة من موظف آخر. أعد تحميل التفاصيل وحاول مجدداً.'
    )
    error.code = 'VERSION_CONFLICT'
    error.currentVersion = (await Transaction.findByPk(id))?.version
    error.expectedVersion = expectedVersion
    throw error
  }

  return Transaction.findByPk(id)
}

module.exports = {
  findDraft,
  create,
  findById,
  findDraftByCode,
  updateDataOptimistic
}