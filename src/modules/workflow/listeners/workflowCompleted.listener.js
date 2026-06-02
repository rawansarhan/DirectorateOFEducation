'use strict'

const eventBus = require('../../../core/shared/events/eventBus')
const EVENTS = require('../../../core/shared/events/types')

eventBus.subscribe(
  EVENTS.WORKFLOW_COMPLETED,
  async payload => {
    console.log('✅ Workflow completed', payload?.transactionId)
  }
)
