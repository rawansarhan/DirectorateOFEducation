'use strict'

const { RoleInputDTO } = require('../dto/RoleInputDTO')
const { RoleUpdateInputDTO } = require('../dto/RoleUpdateInputDTO')
const { OrgDeptRoleOutputDTO } = require('../dto/OrgDeptRoleOutputDTO')
const { RoleByDepartmentOutputDTO } = require('../dto/RoleByDepartmentOutputDTO')

function toCreateInput (data) {
  return new RoleInputDTO(data)
}

function toUpdateInput (data) {
  return new RoleUpdateInputDTO(data)
}

function toUpdatePayload (input, { camunda_group_key } = {}) {
  const payload = {}
  if (input.organization_id !== undefined) payload.organization_id = input.organization_id
  if (input.department_id !== undefined) payload.department_id = input.department_id
  if (input.parent_id !== undefined) payload.parent_id = input.parent_id
  if (camunda_group_key !== undefined) payload.camunda_group_key = camunda_group_key
  return payload
}

function toDTO (row) {
  return new OrgDeptRoleOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

function toByDepartmentDTO (row) {
  return new RoleByDepartmentOutputDTO(row)
}

function toByDepartmentDTOList (rows = []) {
  return rows.map(row => toByDepartmentDTO(row))
}

module.exports = {
  toCreateInput,
  toUpdateInput,
  toUpdatePayload,
  toDTO,
  toDTOList,
  toByDepartmentDTO,
  toByDepartmentDTOList
}
