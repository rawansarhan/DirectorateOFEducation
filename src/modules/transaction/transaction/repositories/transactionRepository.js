'use strict'

const { Op } = require('sequelize')

const { Transaction } = require('../../../../entities')

const VALID_USER_LIST_STATUSES = [
  'draft',
  'submitted',
  'in_progress',
  'completed',
  'rejected'
]

async function findDraft (typeTransId) {
  return Transaction.findOne({
    where: {
      id: typeTransId,
      status: 'draft'
    },
    order: [['created_at', 'DESC']]
  })
}
//
async function findInFlightByUserAndCode (userId, code) {
  return Transaction.findOne({
    where: {
      user_id: userId,
      code,
      status: {
        [Op.in]: ['submitted', 'in_progress']
      }
    },
    order: [['created_at', 'DESC']]
  })
}

async function findDraftByCode (userId, code) {
  return Transaction.findOne({
    where: {
      user_id: userId,
      code,
      status: 'draft'
    },
    order: [['created_at', 'DESC']]
  })
}

async function create (data) {
  return Transaction.create(data)
}

async function findById (id, dbTransaction = null) {
  return Transaction.findByPk(id, { transaction: dbTransaction })
}

async function updateStatus (id, status, dbTransaction = null) {
  const row = await Transaction.findByPk(id, { transaction: dbTransaction })

  if (!row) {
    throw new Error('Transaction not found')
  }

  await row.update({ status }, { transaction: dbTransaction })

  return row
}

async function updateDataOptimistic (id, data, expectedVersion, dbTransaction = null) {
  const transaction = await Transaction.findByPk(id, { transaction: dbTransaction })

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
      },
      transaction: dbTransaction
    }
  )

  if (!affectedRows) {
    const error = new Error(
      'تم تعديل المعاملة من موظف آخر. أعد تحميل التفاصيل وحاول مجدداً.'
    )
    error.code = 'VERSION_CONFLICT'
    error.currentVersion = (await Transaction.findByPk(id, { transaction: dbTransaction }))?.version
    error.expectedVersion = expectedVersion
    throw error
  }

  return Transaction.findByPk(id, { transaction: dbTransaction })
}

async function findAndCountByUserId ({
  userId,
  status,
  limit,
  offset
}) {
  const db = require('../../../../entities')
  const where = { user_id: userId }

  if (status) {
    where.status = status
  }

  return db.Transaction.findAndCountAll({
    where,
    attributes: [
      'id',
      'user_id',
      'code',
      'id_process',
      'status',
      'created_at',
      'updated_at'
    ],
    include: [
      {
        model: db.ProcessInstance,
        as: 'process_instance',
        required: false,
        attributes: [
          'id',
          'status',
          'process_definition_id',
          'current_stage_id'
        ],
        include: [
          {
            model: db.ProcessDefinition,
            as: 'process_definition',
            attributes: ['id', 'name', 'priority', 'code', 'is_complaint']
          },
          {
            model: db.Stage,
            as: 'current_stage',
            attributes: ['id', 'name'],
            required: false
          }
        ]
      }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
    distinct: true
  })
}

async function countByUserIdGroupByStatus (userId) {
  const db = require('../../../../entities')

  return db.Transaction.findAll({
    attributes: [
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    where: { user_id: userId },
    group: ['status'],
    raw: true
  })
}

module.exports = {
  findDraft,
  create,
  findById,
  findDraftByCode,
  findInFlightByUserAndCode,
  findAndCountByUserId,
  countByUserIdGroupByStatus,
  VALID_USER_LIST_STATUSES,
  updateDataOptimistic,
  updateStatus
}
