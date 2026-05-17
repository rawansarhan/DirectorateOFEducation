'use strict'

const bcrypt = require('bcrypt')
const { QueryTypes } = require('sequelize')

const EMAIL = 'sarhrawan@gmail.com'
const PHONE = '0984545282'
const PASSWORD = 'Test123'
const ROLE_CODE = 'TECHNICAL_OFFICER'

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize
    const hash = await bcrypt.hash(PASSWORD, 10)

    // ================= USER (idempotent) =================
    const [user] = await sequelize.query(
      `INSERT INTO users ("userName", email, phone_number, password, created_at, updated_at)
       VALUES ('testUser', :email, :phone, :hash, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
         SET phone_number = EXCLUDED.phone_number,
             password = EXCLUDED.password,
             updated_at = NOW()
       RETURNING id`,
      {
        replacements: { email: EMAIL, phone: PHONE, hash },
        type: QueryTypes.INSERT
      }
    )

    const userId = user[0].id

    // ================= ROLE =================
    const role = await sequelize.query(
      `SELECT id FROM roles WHERE code = :code LIMIT 1`,
      {
        replacements: { code: ROLE_CODE },
        type: QueryTypes.SELECT
      }
    )

    if (!role.length) throw new Error('Role not found')

    const roleId = role[0].id

    // ================= ORG_DEPT_ROLE (idempotent) =================
    const [odr] = await sequelize.query(
      `
      INSERT INTO organization_department_roles
      (role_id, camunda_group_key, created_at, updated_at)
      VALUES (:roleId, :key, NOW(), NOW())
      ON CONFLICT (camunda_group_key) DO UPDATE
        SET updated_at = NOW()
      RETURNING id
      `,
      {
        replacements: {
          roleId,
          key: ROLE_CODE
        },
        type: QueryTypes.INSERT
      }
    )

    const odrId = odr[0].id

    // ================= ASSIGNMENT (idempotent) =================
    await sequelize.query(
      `
      INSERT INTO user_role_assignments
      (user_id, organization_department_roles_id, created_at, updated_at)
      VALUES (:userId, :odrId, NOW(), NOW())
      ON CONFLICT DO NOTHING
      `,
      {
        replacements: { userId, odrId }
      }
    )
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('user_role_assignments', null, {})
    await queryInterface.bulkDelete('organization_department_roles', null, {})
    await queryInterface.bulkDelete('users', { email: EMAIL }, {})
  }
}
