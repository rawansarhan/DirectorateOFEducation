'use strict'

const { QueryTypes } = require('sequelize')

/**
 * يصلح فجوة: APPOINTMENT_VIEW_AVAILABLE (type=employee,citizen)
 * لم تكن تُربط بدور CITIZEN لأن seeder الربط السابق
 * كان يتجاهل type = employee,citizen.
 *
 * Idempotent — آمن للتشغيل على بيئات موجودة.
 */
module.exports = {
  async up (queryInterface) {
    const sequelize = queryInterface.sequelize

    const [permission] = await sequelize.query(
      `
      SELECT id
      FROM permissions
      WHERE code = 'APPOINTMENT_VIEW_AVAILABLE'
      LIMIT 1
      `,
      { type: QueryTypes.SELECT }
    )

    if (!permission) {
      console.warn(
        '[seed-citizen-appointment-view] الصلاحية APPOINTMENT_VIEW_AVAILABLE غير موجودة — تم التخطي'
      )
      return
    }

    const orgDeptRoles = await sequelize.query(
      `
      SELECT id
      FROM organization_department_roles
      WHERE camunda_group_key = 'CITIZEN'
      `,
      { type: QueryTypes.SELECT }
    )

    if (!orgDeptRoles.length) {
      console.warn(
        '[seed-citizen-appointment-view] لا يوجد ODR لـ CITIZEN — تم التخطي'
      )
      return
    }

    const existing = await sequelize.query(
      `
      SELECT organization_department_roles_id
      FROM role_permissions
      WHERE permission_id = :permissionId
        AND organization_department_roles_id IN (:odrIds)
      `,
      {
        replacements: {
          permissionId: permission.id,
          odrIds: orgDeptRoles.map(row => row.id)
        },
        type: QueryTypes.SELECT
      }
    )

    const existingSet = new Set(
      existing.map(row => row.organization_department_roles_id)
    )

    const rowsToInsert = orgDeptRoles
      .filter(row => !existingSet.has(row.id))
      .map(row => ({
        organization_department_roles_id: row.id,
        permission_id: permission.id
      }))

    if (!rowsToInsert.length) {
      console.log(
        '[seed-citizen-appointment-view] APPOINTMENT_VIEW_AVAILABLE مربوطة مسبقاً بـ CITIZEN'
      )
      return
    }

    await queryInterface.bulkInsert('role_permissions', rowsToInsert)
    console.log(
      `[seed-citizen-appointment-view] تم ربط APPOINTMENT_VIEW_AVAILABLE بـ ${rowsToInsert.length} دور CITIZEN`
    )
  },

  async down (queryInterface) {
    const sequelize = queryInterface.sequelize

    await sequelize.query(
      `
      DELETE FROM role_permissions
      WHERE permission_id = (
        SELECT id FROM permissions WHERE code = 'APPOINTMENT_VIEW_AVAILABLE' LIMIT 1
      )
      AND organization_department_roles_id IN (
        SELECT id FROM organization_department_roles WHERE camunda_group_key = 'CITIZEN'
      )
      `
    )
  }
}
