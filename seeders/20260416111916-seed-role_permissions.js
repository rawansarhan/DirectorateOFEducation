'use strict'

const { QueryTypes } = require('sequelize')

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize

    // get role id dynamically
    const roles = await sequelize.query(
      `SELECT id, code FROM roles`,
      { type: QueryTypes.SELECT }
    )

    const roleMap = Object.fromEntries(roles.map(r => [r.code, r.id]))

    const permissions = await sequelize.query(
      `SELECT id, name FROM permissions`,
      { type: QueryTypes.SELECT }
    )

    const permMap = Object.fromEntries(permissions.map(p => [p.name, p.id]))

    const data = [
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.TYPETPROCESS_CREATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.TYPETPROCESS_UPDATE
      },
      {
        organization_department_roles_id: roleMap.TECHNICAL_OFFICER,
        permission_id: permMap.TYPETPROCESS_VIEW
      }
    ]

    await queryInterface.bulkInsert('role_permissions', data)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {})
  }
}