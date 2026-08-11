// core/shared/outbox/services/outboxProcessor.js

const outboxRepository =
  require('../repositories/OutboxRepository')

const eventBus =
  require('../../events/eventBus')

// =====================================
// PROCESS OUTBOX EVENTS
// =====================================

async function processOutbox () {

  // ===================================
  // GET PENDING EVENTS
  // ===================================

  const events =
    await outboxRepository.findPending()

  if (!events.length) {
    return
  }

  console.log(
    `📦 Processing ${events.length} outbox events`
  )

  // ===================================
  // LOOP EVENTS
  // ===================================

  for (const event of events) {

    try {

      // ===============================
      // PUBLISH EVENT
      // ===============================

      await eventBus.dispatch(
        event.event_type,
        event.payload
      )

      // ===============================
      // MARK PROCESSED
      // ===============================

      await outboxRepository.markProcessed(
        event.id
      )

      console.log(
        `✅ PROCESSED: ${event.event_type}`
      )

    } catch (err) {

      const exceptionLogger = require('../../../logging/exceptionLogger')
      exceptionLogger.error({
        message: 'outbox_processor_event_failed',
        err,
        event_type: event.event_type,
        outbox_event_id: event.id
      })

      // ===============================
      // MARK FAILED
      // ===============================

      await outboxRepository.markFailed(
        event.id,
        err.message
      )
    }
  }
}

module.exports = {
  processOutbox
}