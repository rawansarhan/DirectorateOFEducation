const { OutboxEvent } = require('../../../../entities')
const { Op } = require('sequelize')

// ====================================
// CREATE EVENT
// ====================================

async function create (data, options = {}) {

  return await OutboxEvent.create(data, options)
}

// ====================================
// FIND PENDING
// ====================================

async function findPending() {

  return await OutboxEvent.findAll({

    where: {
      status: 'pending'
    },

    order: [
      ['created_at', 'ASC']
    ],

    limit: 50
  })
}

// ====================================
// MARK PROCESSED
// ====================================

async function markProcessed(id) {

  return await OutboxEvent.update({

    status: 'processed',

    processed_at: new Date()

  }, {

    where: { id }
  })
}

// ====================================
// MARK FAILED
// ====================================

async function markFailed(id, error) {

  return await OutboxEvent.update({

    status: 'failed',

    last_error: error

  }, {

    where: { id }
  })
}

async function resetToPending (id) {

  return await OutboxEvent.update({

    status: 'pending',

    last_error: null

  }, {

    where: { id }
  })
}

async function findByEventTypeAndStatuses (eventType, statuses = ['pending']) {

  return await OutboxEvent.findAll({

    where: {
      event_type: eventType,
      status: { [Op.in]: statuses }
    },

    order: [
      ['created_at', 'ASC']
    ],

    limit: 50
  })
}

module.exports = {
  create,
  findPending,
  markProcessed,
  markFailed,
  resetToPending,
  findByEventTypeAndStatuses
}