'use strict'

const { QueryTypes } = require('sequelize')

/** يمنح APP_VERSION_MANAGE لدور TECHNICAL_OFFICER فقط — إدارة الإصدارات مسؤولية تقنية. */
module.exports = {
  async up (queryInterface) {
    const sequelize = queryInterface.sequelize

    const [role] = await sequelize.query(
      `SELECT id FROM organization_department_roles WHERE camunda_group_key = 'TECHNICAL_OFFICER' LIMIT 1`,
      { type: QueryTypes.SELECT }
    )
    if (!role) throw new Error('TECHNICAL_OFFICER not found')

    const [perm] = await sequelize.query(
      `SELECT id FROM permissions WHERE name = 'APP_VERSION_MANAGE' LIMIT 1`,
      { type: QueryTypes.SELECT }
    )
    if (!perm) throw new Error('APP_VERSION_MANAGE permission not found')

    await queryInterface.bulkInsert(
      'role_permissions',
      [{
        organization_department_roles_id: role.id,
        permission_id: perm.id
      }],
      { ignoreDuplicates: true }
    )
  },

  async down (queryInterface) {
    const sequelize = queryInterface.sequelize

    const [role] = await sequelize.query(
      `SELECT id FROM organization_department_roles WHERE camunda_group_key = 'TECHNICAL_OFFICER' LIMIT 1`,
      { type: QueryTypes.SELECT }
    )
    const [perm] = await sequelize.query(
      `SELECT id FROM permissions WHERE name = 'APP_VERSION_MANAGE' LIMIT 1`,
      { type: QueryTypes.SELECT }
    )
    if (!role || !perm) return

    await queryInterface.bulkDelete('role_permissions', {
      organization_department_roles_id: role.id,
      permission_id: perm.id
    }, {})
  }
}
