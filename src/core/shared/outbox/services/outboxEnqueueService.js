'use strict'

const OutboxRepository = require('../repositories/OutboxRepository')

async function enqueueOutboxEvent (eventType, payload, options = {}) {
  if (!eventType) {
    throw new Error('enqueueOutboxEvent: event_type مطلوب')
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('enqueueOutboxEvent: payload مطلوب')
  }

  return OutboxRepository.create(
    {
      event_type: eventType,
      payload,
      status: 'pending'
    },
    options
  )
}

module.exports = {
  enqueueOutboxEvent
}
