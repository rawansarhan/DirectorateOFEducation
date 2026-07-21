'use strict'

const { EmployeeTaskOutputDTO } = require('../dto/EmployeeTaskOutputDTO')

function toEmployeeTaskItem ({
  processInstance,
  activeTask,
  userId,
  progressPercent,
  employeeStatus,
  stageNameOverride = null
}) {
  return new EmployeeTaskOutputDTO({
    processInstance,
    activeTask,
    userId,
    progressPercent,
    employeeStatus,
    stageNameOverride
  })
}

module.exports = {
  toEmployeeTaskItem
}
