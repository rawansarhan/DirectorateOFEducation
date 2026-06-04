const eventBus =
  require('../../../core/shared/events/eventBus')

const EVENTS =
  require('../../../core/shared/events/types')

const {
  createProcessStage
} = require('../services/processInstanceStage')

// =====================================
// LISTEN
// =====================================

eventBus.subscribe(

  EVENTS.PROCESSINSTANCESTAGE_CREATED,

  async payload => {

    console.log(
      '📥 PROCESS STAGE CREATED',
      payload
    )

    await createProcessStage(payload)
  }
)