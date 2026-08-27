'use strict'

/**
 * ينشئ فقط OrgDepRole للمواطن:
 * - role: CITIZEN
 * - organization_id / department_id = null
 * - camunda_group_key = CITIZEN
 *
 * OrgDepRole للمسؤول التقني يُنشأ في:
 * seeders/20260414195700-seed-technical-officer-rbac-context.js
 */
module.exports = {
  async up (queryInterface) {
    const sequelize = queryInterface.sequelize
    const { QueryTypes } = require('sequelize')
    const now = new Date()

    const roles = await sequelize.query(
      `SELECT id, code FROM roles WHERE code = 'CITIZEN' LIMIT 1`,
      { type: QueryTypes.SELECT }
    )

    if (!roles.length) {
      throw new Error('Role not found: CITIZEN — شغّل seed-role-technical-officer أولاً')
    }

    const roleId = roles[0].id

    const existing = await sequelize.query(
      `
      SELECT id
      FROM organization_department_roles
      WHERE role_id = :roleId
        AND organization_id IS NULL
        AND department_id IS NULL
        AND camunda_group_key = 'CITIZEN'
      LIMIT 1
      `,
      {
        replacements: { roleId },
        type: QueryTypes.SELECT
      }
    )

    if (existing.length) {
      return
    }

    await queryInterface.bulkInsert('organization_department_roles', [
      {
        role_id: roleId,
        organization_id: null,
        department_id: null,
        parent_id: null,
        camunda_group_key: 'CITIZEN',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ])
  },

  async down (queryInterface) {
    const sequelize = queryInterface.sequelize
    const { QueryTypes } = require('sequelize')

    const roles = await sequelize.query(
      `SELECT id FROM roles WHERE code = 'CITIZEN' LIMIT 1`,
      { type: QueryTypes.SELECT }
    )

    if (!roles.length) {
      return
    }

    await queryInterface.bulkDelete(
      'organization_department_roles',
      {
        role_id: roles[0].id,
        camunda_group_key: 'CITIZEN'
      },
      {}
    )
  }
}
