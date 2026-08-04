'use strict'

const { QueryTypes, Op } = require('sequelize')

/**
 * يربط role_permissions حسب camunda_group_key:
 *
 * CITIZEN            → permission.type IN ('citizen', 'employee,citizen,admin')
 * TECHNICAL_OFFICER  → permission.type IN ('admin', 'employee,citizen,admin')
 *
 * يجب تشغيله بعد:
 * - seed permissions
 * - seed roles
 * - seed organization_department_roles (CITIZEN)
 * - seed technical-officer-rbac-context (TECHNICAL_OFFICER)
 */
const BINDINGS = [
  {
    camundaGroupKey: 'CITIZEN',
    permissionTypes: ['citizen', 'employee,citizen,admin']
  },
  {
    camundaGroupKey: 'TECHNICAL_OFFICER',
    permissionTypes: ['admin', 'employee,citizen,admin']
  }
]

async function findOrgDeptRolesByGroupKey (sequelize, camundaGroupKey) {
  return sequelize.query(
    `
    SELECT id, camunda_group_key
    FROM organization_department_roles
    WHERE camunda_group_key = :camundaGroupKey
    `,
    {
      replacements: { camundaGroupKey },
      type: QueryTypes.SELECT
    }
  )
}

async function findPermissionsByTypes (sequelize, types) {
  return sequelize.query(
    `
    SELECT id, code, type
    FROM permissions
    WHERE type IN (:types)
    `,
    {
      replacements: { types },
      type: QueryTypes.SELECT
    }
  )
}

async function existingRolePermissionKeys (sequelize, odrIds) {
  if (!odrIds.length) {
    return new Set()
  }

  const rows = await sequelize.query(
    `
    SELECT organization_department_roles_id, permission_id
    FROM role_permissions
    WHERE organization_department_roles_id IN (:odrIds)
    `,
    {
      replacements: { odrIds },
      type: QueryTypes.SELECT
    }
  )

  return new Set(
    rows.map(
      row => `${row.organization_department_roles_id}:${row.permission_id}`
    )
  )
}

module.exports = {
  async up (queryInterface) {
    const sequelize = queryInterface.sequelize
    const rowsToInsert = []
    const allOdrIds = []

    for (const binding of BINDINGS) {
      const orgDeptRoles = await findOrgDeptRolesByGroupKey(
        sequelize,
        binding.camundaGroupKey
      )

      if (!orgDeptRoles.length) {
        console.warn(
          `[seed-role_permissions] لا يوجد organization_department_roles بـ camunda_group_key=${binding.camundaGroupKey} — تم التخطي`
        )
        continue
      }

      const permissions = await findPermissionsByTypes(
        sequelize,
        binding.permissionTypes
      )

      if (!permissions.length) {
        console.warn(
          `[seed-role_permissions] لا توجد permissions بالأنواع ${binding.permissionTypes.join(', ')} — تم التخطي`
        )
        continue
      }

      for (const odr of orgDeptRoles) {
        allOdrIds.push(odr.id)

        for (const permission of permissions) {
          rowsToInsert.push({
            organization_department_roles_id: odr.id,
            permission_id: permission.id
          })
        }
      }
    }

    if (!rowsToInsert.length) {
      console.warn('[seed-role_permissions] لا توجد روابط لإدراجها')
      return
    }

    const existing = await existingRolePermissionKeys(sequelize, [...new Set(allOdrIds)])
    const uniqueRows = rowsToInsert.filter(row => {
      const key = `${row.organization_department_roles_id}:${row.permission_id}`
      return !existing.has(key)
    })

    if (!uniqueRows.length) {
      console.log('[seed-role_permissions] كل الروابط موجودة مسبقاً')
      return
    }

    await queryInterface.bulkInsert('role_permissions', uniqueRows)
    console.log(
      `[seed-role_permissions] تم إدراج ${uniqueRows.length} رابط role_permissions`
    )
  },

  async down (queryInterface) {
    const sequelize = queryInterface.sequelize

    for (const binding of BINDINGS) {
      const orgDeptRoles = await findOrgDeptRolesByGroupKey(
        sequelize,
        binding.camundaGroupKey
      )
      const permissions = await findPermissionsByTypes(
        sequelize,
        binding.permissionTypes
      )

      if (!orgDeptRoles.length || !permissions.length) {
        continue
      }

      await queryInterface.bulkDelete(
        'role_permissions',
        {
          organization_department_roles_id: {
            [Op.in]: orgDeptRoles.map(row => row.id)
          },
          permission_id: {
            [Op.in]: permissions.map(row => row.id)
          }
        },
        {}
      )
    }
  }
}
