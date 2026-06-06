'use strict'

const processRepository =
  require('../../processDefinition/repositories/processRepository')

async function findAuthComplaintProcesses (typeTransId, roleIds) {
  return processRepository.findAuthProcesses(typeTransId, roleIds)
}

async function findAuthComplaintProcessesForCache (typeTransId) {
  return processRepository.findAuthProcessesForCache(typeTransId)
}

module.exports = {
  findAuthComplaintProcesses,
  findAuthComplaintProcessesForCache
}
