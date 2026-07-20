'use strict'

const { EmployeeUpdateInputDTO } = require('../dto/EmployeeUpdateInputDTO')
const { EmployeeOutputDTO } = require('../dto/EmployeeOutputDTO')
const { EmployeeAssignmentOutputDTO } = require('../dto/EmployeeAssignmentOutputDTO')
const { DepartmentEmployeeOutputDTO } = require('../dto/DepartmentEmployeeOutputDTO')

const USER_DIRECT_FIELDS = [
  'first_name',
  'last_name',
  'father_name',
  'mother_name',
  'national_id',
  'userName',
  'email',
  'phone_number',
  'is_active'
]

function toUpdateInput (data) {
  return new EmployeeUpdateInputDTO(data)
}

function toUpdateUserPayload (input) {
  const payload = {}

  for (const field of USER_DIRECT_FIELDS) {
    if (input[field] !== undefined) {
      payload[field] = input[field]
    }
  }

  return payload
}

function toDTO (row) {
  return new EmployeeOutputDTO(row)
}

function toDTOList (rows = []) {
  return rows.map(row => toDTO(row))
}

function toAssignmentDTO (assignment) {
  return new EmployeeAssignmentOutputDTO(assignment)
}

function toAssignmentDTOList (rows = []) {
  return rows.map(row => toAssignmentDTO(row))
}

function toDepartmentEmployeeDTO (payload) {
  return new DepartmentEmployeeOutputDTO(payload)
}

module.exports = {
  toUpdateInput,
  toUpdateUserPayload,
  toDTO,
  toDTOList,
  toAssignmentDTO,
  toAssignmentDTOList,
  toDepartmentEmployeeDTO
}
