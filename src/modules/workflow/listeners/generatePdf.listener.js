'use strict'

const eventBus = require('../../../core/shared/events/eventBus')
const EVENTS = require('../../../core/shared/events/types')
const {
  executeGeneratePdfJob
} = require('../actions/services/generatePdfJobService')

eventBus.subscribe(EVENTS.GENERATE_PDF, async payload => {
  console.log('[GeneratePDF] outbox job start', {
    transactionId: payload?.transaction_id,
    templateId: payload?.template_id
  })

  const result = await executeGeneratePdfJob({
    ...payload,
    persist_history: true
  })

  console.log('[GeneratePDF] outbox job done', {
    transactionId: result.transaction_id,
    templateId: result.template_id,
    status: result.status,
    skipped: Boolean(result.skipped)
  })

  return result
})
