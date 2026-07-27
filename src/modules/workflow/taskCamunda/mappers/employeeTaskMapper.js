'use strict'

const { EmployeeTaskOutputDTO } = require('../dto/EmployeeTaskOutputDTO')

function toEmployeeTaskItem ({
  processInstance,
  activeTask,
  activeStage = null,
  userId,
  progressPercent,
  employeeStatus,
  stageNameOverride = null
}) {
  return new EmployeeTaskOutputDTO({
    processInstance,
    activeTask,
    activeStage,
    userId,
    progressPercent,
    employeeStatus,
    stageNameOverride
  })
}

module.exports = {
  toEmployeeTaskItem
}
