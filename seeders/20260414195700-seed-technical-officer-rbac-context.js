'use strict'

/**
 * سياق RBAC للمسؤول التقني فقط:
 * - OrgDepRole (TECHNICAL_OFFICER)
 * - يوزر
 * - user_role_assignments
 *
 * CITIZEN: role فقط + OrgDepRole بدون يوزر
 * (انظر seed-role-technical-officer + seed-organization_department_roles)
 */
const bcrypt = require('bcrypt')
const { QueryTypes } = require('sequelize')

const ROLE_CODE = 'TECHNICAL_OFFICER'
const CAMUNDA_GROUP_KEY = 'TECHNICAL_OFFICER'
const EMAIL = 'sarhrawan@gmail.com'
const PHONE = '0984545282'
const PASSWORD = 'Test123!'
const USER_NAME = 'technical_officer'

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize
    const hash = await bcrypt.hash(PASSWORD, 10)

    const [userRows] = await sequelize.query(
      `
      INSERT INTO users ("userName", email, phone_number, password, created_at, updated_at)
      VALUES (:userName, :email, :phone, :hash, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
        SET "userName" = EXCLUDED."userName",
            phone_number = EXCLUDED.phone_number,
            password = EXCLUDED.password,
            updated_at = NOW()
      RETURNING id
      `,
      {
        replacements: {
          userName: USER_NAME,
          email: EMAIL,
          phone: PHONE,
          hash
        },
        type: QueryTypes.INSERT
      }
    )

    const userId = userRows[0].id

    const roles = await sequelize.query(
      `SELECT id FROM roles WHERE code = :code LIMIT 1`,
      {
        replacements: { code: ROLE_CODE },
        type: QueryTypes.SELECT
      }
    )

    if (!roles.length) {
      throw new Error('Role not found: TECHNICAL_OFFICER')
    }

    const roleId = roles[0].id

    let odrId
    const existingOdr = await sequelize.query(
      `
      SELECT id
      FROM organization_department_roles
      WHERE camunda_group_key = :key
      LIMIT 1
      `,
      {
        replacements: { key: CAMUNDA_GROUP_KEY },
        type: QueryTypes.SELECT
      }
    )

    if (existingOdr.length) {
      odrId = existingOdr[0].id
    } else {
      const [odrRows] = await sequelize.query(
        `
        INSERT INTO organization_department_roles
          (role_id, organization_id, department_id, parent_id, camunda_group_key, is_active, created_at, updated_at)
        VALUES
          (:roleId, NULL, NULL, NULL, :key, true, NOW(), NOW())
        RETURNING id
        `,
        {
          replacements: { roleId, key: CAMUNDA_GROUP_KEY },
          type: QueryTypes.INSERT
        }
      )
      odrId = odrRows[0].id
    }

    const existingAssignment = await sequelize.query(
      `
      SELECT id
      FROM user_role_assignments
      WHERE user_id = :userId
        AND organization_department_roles_id = :odrId
      LIMIT 1
      `,
      {
        replacements: { userId, odrId },
        type: QueryTypes.SELECT
      }
    )

    if (!existingAssignment.length) {
      await sequelize.query(
        `
        INSERT INTO user_role_assignments
          (user_id, organization_department_roles_id, created_at, updated_at)
        VALUES
          (:userId, :odrId, NOW(), NOW())
        `,
        {
          replacements: { userId, odrId }
        }
      )
    }
  },

  down: async (queryInterface) => {
    const sequelize = queryInterface.sequelize

    const users = await sequelize.query(
      `SELECT id FROM users WHERE email = :email`,
      {
        replacements: { email: EMAIL },
        type: QueryTypes.SELECT
      }
    )

    const userIds = users.map(u => u.id)

    if (userIds.length) {
      await queryInterface.bulkDelete(
        'user_role_assignments',
        { user_id: userIds },
        {}
      )
    }

    await queryInterface.bulkDelete(
      'organization_department_roles',
      { camunda_group_key: CAMUNDA_GROUP_KEY },
      {}
    )

    await queryInterface.bulkDelete(
      'users',
      { email: EMAIL },
      {}
    )
  }
}
