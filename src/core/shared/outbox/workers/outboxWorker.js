const eventBus = require('../../events/eventBus')
const OutboxRepository = require('../repositories/OutboxRepository')
const { OUTBOX_POLL_INTERVAL_MS } = require('../../../config/env')
const {
  retryFailedGeneratePdfEvents,
  failGeneratePdfEvent
} = require('../services/generatePdfOutboxService')
const EVENTS = require('../../events/types')
const exceptionLogger = require('../../../logging/exceptionLogger')

let isRunning = false

async function processOutbox () {
  if (isRunning) return
  isRunning = true

  try {
    await retryFailedGeneratePdfEvents()

    const events = await OutboxRepository.findPending()

    for (const event of events) {
      try {
        await eventBus.dispatch(event.event_type, event.payload)
        await OutboxRepository.markProcessed(event.id)
        console.log(`✅ Outbox processed: ${event.event_type}`)
      } catch (err) {
        exceptionLogger.error({
          message: 'outbox_event_failed',
          err,
          outbox_event_id: event.id,
          event_type: event.event_type,
          transaction_id: event.payload?.transaction_id || null
        })

        if (event.event_type === EVENTS.GENERATE_PDF) {
          await failGeneratePdfEvent(event, err)
        } else {
          await OutboxRepository.markFailed(event.id, err.message)
        }
      }
    }
  } catch (err) {
    exceptionLogger.error({
      message: 'outbox_worker_error',
      err,
      component: 'outboxWorker'
    })
  }

  isRunning = false
}

function startOutboxWorker () {
  console.log(`📦 Outbox Worker Started (poll=${OUTBOX_POLL_INTERVAL_MS}ms)`)
  setInterval(processOutbox, OUTBOX_POLL_INTERVAL_MS)
}

module.exports = {
  startOutboxWorker
}
