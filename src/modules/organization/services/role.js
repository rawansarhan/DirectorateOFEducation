'use strict'

const {
  ValidateCreateRole,
  ValidateUpdateRole
} = require('../validations/roleValidation')

const { sequelize } = require('../../../entities')

const organizationRepository = require('../repositories/organizationRepository')
const departmentRepository = require('../repositories/departmentRepository')
const roleRepository = require('../repositories/roleRepository')
const orgDeptRoleRepository = require('../repositories/orgDeptRoleRepository')

function buildCamundaGroupKey(roleCode, organizationId, departmentId) {
  return `${roleCode}__ORG${organizationId}__DEPT${departmentId}`
}

// ================= CREATE =================
async function createRoleService(data) {
  const { error } = ValidateCreateRole(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = 400
    throw err
  }

  const organization = await organizationRepository.findById(data.organization_id)
  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  const department = await departmentRepository.findById(data.department_id)
  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  if (department.organization_id !== organization.id) {
    const err = new Error('القسم لا ينتمي إلى المؤسسة المحددة')
    err.statusCode = 400
    throw err
  }

  if (data.parent_id) {
    const parent = await orgDeptRoleRepository.findById(data.parent_id)
    if (!parent) {
      const err = new Error('الدور الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const result = await sequelize.transaction(async (t) => {
    let role = await roleRepository.findByCode(data.code, { transaction: t })

    if (!role) {
      role = await roleRepository.create(
        {
          name: data.name,
          code: data.code
        },
        { transaction: t }
      )
    }

    const duplicate = await orgDeptRoleRepository.findByRoleOrgDept(
      role.id,
      data.organization_id,
      data.department_id,
      { transaction: t }
    )

    if (duplicate) {
      const err = new Error('هذا الدور مرتبط مسبقاً بهذه المؤسسة والقسم')
      err.statusCode = 409
      throw err
    }

    const orgDeptRole = await orgDeptRoleRepository.create(
      {
        role_id: role.id,
        organization_id: data.organization_id,
        department_id: data.department_id,
        parent_id: data.parent_id ?? null,
        is_active: true,
        camunda_group_key: buildCamundaGroupKey(
          role.code,
          data.organization_id,
          data.department_id
        )
      },
      { transaction: t }
    )

    return { role, orgDeptRole }
  })

  return orgDeptRoleRepository.findByIdWithRelations(result.orgDeptRole.id)
}

// ================= UPDATE =================
async function updateRoleService(data, id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const { error } = ValidateUpdateRole(data)

  if (error) {
    const msg = error.details.map(d => d.message).join(' | ')
    const err = new Error(msg)
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await orgDeptRoleRepository.findByIdWithRole(orgDeptRoleId)

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  const newOrgId = data.organization_id ?? orgDeptRole.organization_id
  const newDeptId = data.department_id ?? orgDeptRole.department_id

  if (data.organization_id !== undefined) {
    const organization = await organizationRepository.findById(data.organization_id)
    if (!organization) {
      const err = new Error('المؤسسة غير موجودة')
      err.statusCode = 404
      throw err
    }
  }

  if (data.department_id !== undefined) {
    const department = await departmentRepository.findById(data.department_id)
    if (!department) {
      const err = new Error('القسم غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  if (data.organization_id !== undefined || data.department_id !== undefined) {
    const dept = await departmentRepository.findById(newDeptId)
    if (dept && dept.organization_id !== newOrgId) {
      const err = new Error('القسم لا ينتمي إلى المؤسسة المحددة')
      err.statusCode = 400
      throw err
    }
  }

  if (data.parent_id !== undefined && data.parent_id !== null) {
    if (data.parent_id === orgDeptRoleId) {
      const err = new Error('لا يمكن أن يكون السجل أب لنفسه')
      err.statusCode = 400
      throw err
    }

    const parent = await orgDeptRoleRepository.findById(data.parent_id)
    if (!parent) {
      const err = new Error('الدور الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  if (data.organization_id !== undefined || data.department_id !== undefined) {
    const duplicate = await orgDeptRoleRepository.findByRoleOrgDept(
      orgDeptRole.role_id,
      newOrgId,
      newDeptId
    )

    if (duplicate && duplicate.id !== orgDeptRoleId) {
      const err = new Error('هذا الدور مرتبط مسبقاً بهذه المؤسسة والقسم')
      err.statusCode = 409
      throw err
    }
  }

  const payload = {}
  if (data.organization_id !== undefined) payload.organization_id = data.organization_id
  if (data.department_id !== undefined) payload.department_id = data.department_id
  if (data.parent_id !== undefined) payload.parent_id = data.parent_id

  if (data.organization_id !== undefined || data.department_id !== undefined) {
    payload.camunda_group_key = buildCamundaGroupKey(
      orgDeptRole.role.code,
      newOrgId,
      newDeptId
    )
  }

  await orgDeptRoleRepository.updateInstance(orgDeptRole, payload)

  return orgDeptRoleRepository.findByIdWithRelations(orgDeptRoleId)
}

// ================= TOGGLE STATUS =================
async function toggleRoleStatusService(id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await orgDeptRoleRepository.findById(orgDeptRoleId)

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  await orgDeptRoleRepository.updateInstance(orgDeptRole, { is_active: !orgDeptRole.is_active })

  return orgDeptRoleRepository.findByIdWithRelations(orgDeptRoleId)
}

// ================= DELETE =================
async function deleteRoleService(id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await orgDeptRoleRepository.findById(orgDeptRoleId)

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  await orgDeptRoleRepository.destroyInstance(orgDeptRole)

  return { id: orgDeptRoleId }
}

// ================= GET ALL =================
async function getAllRolesService() {
  return orgDeptRoleRepository.findAll()
}

// ================= GET BY ID =================
async function getRoleByIdService(id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await orgDeptRoleRepository.findByIdWithRelations(orgDeptRoleId, { includeChildren: true })

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  return orgDeptRole
}

// ================= GET ROLES BY DEPARTMENT =================
// يعيد كل الأدوار المرتبطة بقسم محدد (للـ leaf department)
// ليستخدمها المستخدم عند تسجيل موظف جديد بعد اختيار القسم
async function getRolesByDepartmentService(departmentId) {
  const deptId = parseInt(departmentId, 10)

  if (!Number.isInteger(deptId) || deptId < 1) {
    const err = new Error('معرّف القسم غير صالح')
    err.statusCode = 400
    throw err
  }

  const department = await departmentRepository.findById(deptId)
  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  const rows = await orgDeptRoleRepository.findActiveByDepartmentIdWithRole(deptId)

  return rows
    .filter(r => r.role)
    .map(r => ({
      id: r.role.id,
      name: r.role.name,
      code: r.role.code
    }))
}

module.exports = {
  createRoleService,
  updateRoleService,
  deleteRoleService,
  getAllRolesService,
  getRoleByIdService,
  getRolesByDepartmentService,
  toggleRoleStatusService
}
