const { OutboxEvent } = require('../../../../entities')

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

module.exports = {
  create,
  findPending,
  markProcessed,
  markFailed
}