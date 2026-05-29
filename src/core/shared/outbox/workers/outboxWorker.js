const eventBus = require('../../events/eventBus')
const OutboxRepository = require('../repositories/OutboxRepository')

const POLL_INTERVAL = 1000

let isRunning = false

async function processOutbox () {
  if (isRunning) return
  isRunning = true

  try {
    const events = await OutboxRepository.findPending()

    for (const event of events) {
      try {
        await eventBus.dispatch(event.event_type, event.payload)
        await OutboxRepository.markProcessed(event.id)
        console.log(`✅ Outbox processed: ${event.event_type}`)
      } catch (err) {
        console.error('❌ Outbox event failed:', event.id, err.message)
        await OutboxRepository.markFailed(event.id, err.message)
      }
    }
  } catch (err) {
    console.error('❌ Outbox worker error:', err.message)
  }

  isRunning = false
}

function startOutboxWorker () {
  console.log('📦 Outbox Worker Started')
  setInterval(processOutbox, POLL_INTERVAL)
}

module.exports = {
  startOutboxWorker
}
