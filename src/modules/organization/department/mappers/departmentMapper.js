'use strict'

const { DepartmentInputDTO } = require('../dto/DepartmentInputDTO')
const { DepartmentUpdateInputDTO } = require('../dto/DepartmentUpdateInputDTO')
const { DepartmentOutputDTO } = require('../dto/DepartmentOutputDTO')
const { DepartmentLeafOutputDTO } = require('../dto/DepartmentLeafOutputDTO')
const { DepartmentOverviewOutputDTO } = require('../dto/DepartmentOverviewOutputDTO')
const {
  AccessibleDepartmentsScopeOutputDTO
} = require('../dto/AccessibleDepartmentsScopeOutputDTO')

function toCreateInput (data) {
  return new DepartmentInputDTO(data)
}

function toUpdateInput (data) {
  return new DepartmentUpdateInputDTO(data)
}

function toCreatePayload (input) {
  return {
    name: input.name,
    organization_id: input.organization_id,
    parent_id: input.parent_id ?? null,
    is_active: true
  }
}

function toUpdatePayload (input) {
  const payload = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.organization_id !== undefined) payload.organization_id = input.organization_id
  if (input.parent_id !== undefined) payload.parent_id = input.parent_id
  return payload
}

function toDTO (row) {
  return new DepartmentOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

function toLeafDTO ({ id, name }) {
  return new DepartmentLeafOutputDTO({ id, name })
}

function toLeafDTOList (rows = []) {
  return rows.map(row => toLeafDTO(row))
}

function toOverviewDTO (payload) {
  return new DepartmentOverviewOutputDTO(payload)
}

function toAccessibleScopeDTO (payload) {
  return new AccessibleDepartmentsScopeOutputDTO(payload)
}

module.exports = {
  toCreateInput,
  toUpdateInput,
  toCreatePayload,
  toUpdatePayload,
  toDTO,
  toDTOList,
  toLeafDTO,
  toLeafDTOList,
  toOverviewDTO,
  toAccessibleScopeDTO
}
