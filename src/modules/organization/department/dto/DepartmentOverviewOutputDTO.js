'use strict'

function toPlain (row) {
  if (!row) return null
  return typeof row.get === 'function' ? row.get({ plain: true }) : row
}

class DepartmentOverviewOutputDTO {
  constructor ({
    department,
    manager = null,
    employees = [],
    sections = [],
    transactionsCount = 0
  }) {
    const plain = toPlain(department) || {}

    this.id = plain.id
    this.name = plain.name
    this.organization_id = plain.organization_id
    this.parent_id = plain.parent_id ?? null
    this.is_active = plain.is_active
    this.organization = plain.organization
      ? { id: plain.organization.id, name: plain.organization.name }
      : null
    this.manager = manager
    this.employees = employees
    this.sections = sections
    this.employeesCount = employees.length
    this.sectionsCount = sections.length
    this.transactionsCount = transactionsCount
  }
}

module.exports = {
  DepartmentOverviewOutputDTO
}
