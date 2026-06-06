'use strict'

const processRepository =
  require('../../processDefinition/repositories/processRepository')

async function findAuthComplaintProcesses (roleIds) {
  return processRepository.findAuthComplaintProcesses(roleIds)
}

async function findAuthComplaintProcessesForCache () {
  return processRepository.findAuthComplaintProcessesForCache()
}

module.exports = {
  findAuthComplaintProcesses,
  findAuthComplaintProcessesForCache
}
