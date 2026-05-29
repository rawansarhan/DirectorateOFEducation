const eventBus =
  require('../../../core/shared/events/eventBus')

const EVENTS =
  require('../../../core/shared/events/types')

const {
  startWorkflow
} = require('../taskCamunda/services/startWorkflowService')

// =====================================
// LISTEN
// =====================================

eventBus.subscribe(

  EVENTS.TRANSACTION_SUBMITTED,

  async payload => {

    console.log(
      '🚀 START WORKFLOW',
      payload
    )

    await startWorkflow(payload)
  }
)