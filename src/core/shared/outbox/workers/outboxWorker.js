const eventBus = require('../../events/eventBus')
const OutboxRepository = require('../repositories/OutboxRepository')
const { OUTBOX_POLL_INTERVAL_MS } = require('../../../config/env')
const {
  retryFailedGeneratePdfEvents,
  failGeneratePdfEvent
} = require('../services/generatePdfOutboxService')
const EVENTS = require('../../events/types')

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
        console.error('❌ Outbox event failed:', event.id, err.message)

        if (event.event_type === EVENTS.GENERATE_PDF) {
          await failGeneratePdfEvent(event, err)
        } else {
          await OutboxRepository.markFailed(event.id, err.message)
        }
      }
    }
  } catch (err) {
    console.error('❌ Outbox worker error:', err.message)
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
