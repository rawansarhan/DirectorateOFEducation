'use strict'

const Sequelize = require('sequelize')

const Op = Sequelize.Op

const processDefinitionRepository =
  require('../repositories/processRepository')

async function updateProcessActivationStatus() {

  const now = new Date()

  console.log('NOW:', now)

  const [activatedCount] =
    await processDefinitionRepository.activateProcesses(now)

  const [deactivatedCount] =
    await processDefinitionRepository.deactivateProcesses(now)

  console.log('Activated:', activatedCount)

  console.log('Deactivated:', deactivatedCount)
}

module.exports = {
  updateProcessActivationStatus
}