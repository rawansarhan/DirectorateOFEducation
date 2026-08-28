'use strict'

/**
 * مدخلات إنشاء سجل الربط. إمّا `role_id` لدور موجود، أو `name` + `code`
 * لدور جديد — التحقق يضمن أن أحدهما فقط موجود.
 */
class RoleInputDTO {
  constructor ({
    role_id = null,
    name = null,
    code = null,
    organization_id,
    department_id,
    parent_id = null
  }) {
    this.role_id = role_id ?? null
    this.name = name ?? null
    this.code = code ?? null
    this.organization_id = organization_id
    this.department_id = department_id
    this.parent_id = parent_id ?? null
  }

  /** true عندما يشير المدخل إلى دور موجود بدل تعريف دور جديد. */
  get usesExistingRole () {
    return this.role_id !== null
  }
}

module.exports = {
  RoleInputDTO
}
