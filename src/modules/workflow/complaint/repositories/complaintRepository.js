'use strict'

const processRepository =
  require('../../processDefinition/repositories/processRepository')

async function findAuthComplaintProcesses (typeTransId, roleIds) {
  return processRepository.findAuthProcesses(typeTransId, roleIds)
}

module.exports = {
  findAuthComplaintProcesses
}
