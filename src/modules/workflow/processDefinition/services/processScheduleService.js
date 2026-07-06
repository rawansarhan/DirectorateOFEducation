'use strict'

const processDefinitionRepository =
  require('../repositories/processRepository')
const {
  invalidateAllProcessLists
} = require('../../../../core/cache/processCacheService')
const {
  invalidateProcessDefinitionDetails
} = require('../../../../core/cache/apiCacheService')

async function updateProcessActivationStatus () {
  const now = new Date()

  const { activated, deactivated } =
    await processDefinitionRepository.syncActivationByYearlySchedule(now)

  if (activated > 0 || deactivated > 0) {
    await invalidateAllProcessLists()
    await invalidateProcessDefinitionDetails()
  }

  console.log(
    `[ProcessSchedule] yearly sync — activated: ${activated}, deactivated: ${deactivated}`
  )

  return { activated, deactivated }
}

module.exports = {
  updateProcessActivationStatus
}
