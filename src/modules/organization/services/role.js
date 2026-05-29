'use strict'

const {
  ValidateCreateRole,
  ValidateUpdateRole
} = require('../validations/roleValidation')

const {
  sequelize,
  Role,
  OrgDeptRole,
  Organization,
  Department
} = require('../../../entities')

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

  const organization = await Organization.findByPk(data.organization_id)
  if (!organization) {
    const err = new Error('المؤسسة غير موجودة')
    err.statusCode = 404
    throw err
  }

  const department = await Department.findByPk(data.department_id)
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
    const parent = await OrgDeptRole.findByPk(data.parent_id)
    if (!parent) {
      const err = new Error('الدور الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  const result = await sequelize.transaction(async (t) => {
    let role = await Role.findOne({
      where: { code: data.code },
      transaction: t
    })

    if (!role) {
      role = await Role.create(
        {
          name: data.name,
          code: data.code
        },
        { transaction: t }
      )
    }

    const duplicate = await OrgDeptRole.findOne({
      where: {
        role_id: role.id,
        organization_id: data.organization_id,
        department_id: data.department_id
      },
      transaction: t
    })

    if (duplicate) {
      const err = new Error('هذا الدور مرتبط مسبقاً بهذه المؤسسة والقسم')
      err.statusCode = 409
      throw err
    }

    const orgDeptRole = await OrgDeptRole.create(
      {
        role_id: role.id,
        organization_id: data.organization_id,
        department_id: data.department_id,
        parent_id: data.parent_id ?? null,
        is_active: data.is_active ?? true,
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

  const fullAssignment = await OrgDeptRole.findByPk(result.orgDeptRole.id, {
    include: [
      { model: Role, as: 'role' },
      { model: Organization, as: 'organization' },
      { model: Department, as: 'department' },
      { model: OrgDeptRole, as: 'parent' }
    ]
  })

  return fullAssignment
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

  const orgDeptRole = await OrgDeptRole.findByPk(orgDeptRoleId, {
    include: [{ model: Role, as: 'role' }]
  })

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  const newOrgId = data.organization_id ?? orgDeptRole.organization_id
  const newDeptId = data.department_id ?? orgDeptRole.department_id

  if (data.organization_id !== undefined) {
    const organization = await Organization.findByPk(data.organization_id)
    if (!organization) {
      const err = new Error('المؤسسة غير موجودة')
      err.statusCode = 404
      throw err
    }
  }

  if (data.department_id !== undefined) {
    const department = await Department.findByPk(data.department_id)
    if (!department) {
      const err = new Error('القسم غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  if (data.organization_id !== undefined || data.department_id !== undefined) {
    const dept = await Department.findByPk(newDeptId)
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

    const parent = await OrgDeptRole.findByPk(data.parent_id)
    if (!parent) {
      const err = new Error('الدور الأب غير موجود')
      err.statusCode = 404
      throw err
    }
  }

  if (data.organization_id !== undefined || data.department_id !== undefined) {
    const duplicate = await OrgDeptRole.findOne({
      where: {
        role_id: orgDeptRole.role_id,
        organization_id: newOrgId,
        department_id: newDeptId
      }
    })

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
  if (data.is_active !== undefined) payload.is_active = data.is_active

  if (data.organization_id !== undefined || data.department_id !== undefined) {
    payload.camunda_group_key = buildCamundaGroupKey(
      orgDeptRole.role.code,
      newOrgId,
      newDeptId
    )
  }

  await orgDeptRole.update(payload)

  const fullAssignment = await OrgDeptRole.findByPk(orgDeptRoleId, {
    include: [
      { model: Role, as: 'role' },
      { model: Organization, as: 'organization' },
      { model: Department, as: 'department' },
      { model: OrgDeptRole, as: 'parent' }
    ]
  })

  return fullAssignment
}

// ================= DELETE =================
async function deleteRoleService(id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await OrgDeptRole.findByPk(orgDeptRoleId)

  if (!orgDeptRole) {
    const err = new Error('السجل غير موجود')
    err.statusCode = 404
    throw err
  }

  await orgDeptRole.destroy()

  return { id: orgDeptRoleId }
}

// ================= GET ALL =================
async function getAllRolesService() {
  const rows = await OrgDeptRole.findAll({
    order: [['id', 'ASC']],
    include: [
      { model: Role, as: 'role' },
      { model: Organization, as: 'organization' },
      { model: Department, as: 'department' },
      { model: OrgDeptRole, as: 'parent' }
    ]
  })

  return rows
}

// ================= GET BY ID =================
async function getRoleByIdService(id) {
  const orgDeptRoleId = parseInt(id, 10)

  if (!Number.isInteger(orgDeptRoleId) || orgDeptRoleId < 1) {
    const err = new Error('المعرّف غير صالح')
    err.statusCode = 400
    throw err
  }

  const orgDeptRole = await OrgDeptRole.findByPk(orgDeptRoleId, {
    include: [
      { model: Role, as: 'role' },
      { model: Organization, as: 'organization' },
      { model: Department, as: 'department' },
      { model: OrgDeptRole, as: 'parent' },
      { model: OrgDeptRole, as: 'children' }
    ]
  })

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

  const department = await Department.findByPk(deptId)
  if (!department) {
    const err = new Error('القسم غير موجود')
    err.statusCode = 404
    throw err
  }

  const rows = await OrgDeptRole.findAll({
    where: { department_id: deptId, is_active: true },
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'code']
      }
    ],
    order: [['id', 'ASC']]
  })

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
  getRolesByDepartmentService
}
