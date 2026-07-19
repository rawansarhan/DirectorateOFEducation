'use strict'

class EmployeeUpdateInputDTO {
  constructor (data = {}) {
    const fields = [
      'first_name',
      'last_name',
      'father_name',
      'mother_name',
      'national_id',
      'userName',
      'email',
      'phone_number',
      'is_active',
      'organization_id',
      'department_id',
      'role_id',
      'password',
      'confirm_password',
      'pin',
      'confirm_pin',
      'public_key',
      'private_key'
    ]

    for (const field of fields) {
      if (data[field] !== undefined) {
        this[field] = data[field]
      }
    }
  }
}

module.exports = {
  EmployeeUpdateInputDTO
}
