'use strict'

const processDefinitionRepository =
  require('../repositories/processRepository')
const {
  invalidateAllProcessLists
} = require('../../../../core/cache/processCacheService')

async function updateProcessActivationStatus () {
  const now = new Date()

  const { activated, deactivated } =
    await processDefinitionRepository.syncActivationByYearlySchedule(now)

  if (activated > 0 || deactivated > 0) {
    await invalidateAllProcessLists()
  }

  console.log(
    `[ProcessSchedule] yearly sync — activated: ${activated}, deactivated: ${deactivated}`
  )

  return { activated, deactivated }
}

module.exports = {
  updateProcessActivationStatus
}
