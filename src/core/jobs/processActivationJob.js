const cron = require('node-cron')
const { updateProcessActivationStatus } = require('../../modules/workflow/services/processScheduleService')
const { PROCESS_ACTIVATION_CRON } = require('../config/env')

cron.schedule(PROCESS_ACTIVATION_CRON, async () => {
  console.log('⏳ Checking process activation...')

  try {
    await updateProcessActivationStatus()
    console.log('✅ Process activation updated')
  } catch (err) {
    console.error('❌ Error updating process activation:', err.message)
  }
})
