const cron = require('node-cron')
const { updateProcessActivationStatus } = require('../../modules/workflow/processDefinition/services/processScheduleService')
const exceptionLogger = require('../logging/exceptionLogger')

// كل دقيقة (تقدر تغيرها)
cron.schedule('* * * * *', async () => {
  console.log('⏳ Checking process activation...')

  try {
    await updateProcessActivationStatus()
    console.log('✅ Process activation updated')
  } catch (err) {
    exceptionLogger.error({
      message: 'process_activation_job_failed',
      err,
      component: 'processActivationJob'
    })
  }
})
