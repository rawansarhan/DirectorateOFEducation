'use strict'

function filterAuthProcessesByRoleIds (processes = [], roleIds = []) {
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    return []
  }

  const roleSet = new Set(roleIds.map(id => Number(id)))

  return processes.filter(process => {
    const authStage = process?.stages?.[0]

    if (!authStage) {
      return false
    }

    const assignments = authStage.stage_assignments || []

    return assignments.some(assignment =>
      roleSet.has(Number(assignment.organization_department_roles_id))
    )
  })
}

module.exports = {
  filterAuthProcessesByRoleIds
}
