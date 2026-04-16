'use strict'

const bcrypt = require('bcrypt')
const { QueryTypes } = require('sequelize')

const DEMO_EMAIL = 'sarhrawan@gmail.com'
const DEMO_USERNAME = 'TECHNICAL_OFFICER'
const DEMO_PHONE = '0954862737'
const DEMO_PASSWORD = 'rawansarhan2002'
const ROLE_CODE = 'TECHNICAL_OFFICER'

module.exports = {
  up: async queryInterface => {
    const sequelize = queryInterface.sequelize
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

    // 1️⃣ user (ديناميكي)
    let user = await sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email: DEMO_EMAIL }, type: QueryTypes.SELECT }
    )

    let userId = user[0]?.id

    if (!userId) {
      const inserted = await sequelize.query(
        `
        INSERT INTO users ("userName", email, phone_number, password, is_active, created_at, updated_at)
        VALUES (:userName, :email, :phone, :passwordHash, true, NOW(), NOW())
        RETURNING id;
        `,
        {
          replacements: {
            userName: DEMO_USERNAME,
            email: DEMO_EMAIL,
            phone: DEMO_PHONE,
            passwordHash
          },
          type: QueryTypes.INSERT
        }
      )

      userId = inserted[0][0].id
    }

    if (!userId) throw new Error('User not found/created')

    // 2️⃣ role (ديناميكي حسب code)
    const roles = await sequelize.query(
      `SELECT id FROM roles WHERE code = :code LIMIT 1`,
      { replacements: { code: ROLE_CODE }, type: QueryTypes.SELECT }
    )

    const roleId = roles[0]?.id
    if (!roleId) throw new Error('Role not found')

    // 3️⃣ organization_department_roles (بدون org/dep)
    await sequelize.query(
      `
      INSERT INTO organization_department_roles (
        role_id, organization_id, department_id, parent_id, is_active, created_at, updated_at
      )
      SELECT :roleId, NULL, NULL, NULL, true, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM organization_department_roles
        WHERE role_id = :roleId
          AND organization_id IS NULL
          AND department_id IS NULL
      )
      RETURNING id;
      `,
      { replacements: { roleId } }
    )

    // 4️⃣ جلب odrId
    const odr = await sequelize.query(
      `
      SELECT id FROM organization_department_roles
      WHERE role_id = :roleId
        AND organization_id IS NULL
        AND department_id IS NULL
      LIMIT 1;
      `,
      { replacements: { roleId }, type: QueryTypes.SELECT }
    )

    const odrId = odr[0]?.id
    if (!odrId) throw new Error('ODR not found')

    // 5️⃣ user_role_assignments (ديناميكي)
    await sequelize.query(
      `
      INSERT INTO user_role_assignments (
        user_id, organization_department_role_id, priority, start_date, end_date, is_active, created_at, updated_at
      )
      SELECT :userId, :odrId, 1, '2026-04-04', NULL, true, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM user_role_assignments
        WHERE user_id = :userId
          AND organization_department_role_id = :odrId
      );
      `,
      { replacements: { userId, odrId } }
    )
  },

  down: async queryInterface => {
    const sequelize = queryInterface.sequelize

    const user = await sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email: DEMO_EMAIL }, type: QueryTypes.SELECT }
    )

    const userId = user[0]?.id

    if (userId) {
      await sequelize.query(
        `DELETE FROM user_role_assignments WHERE user_id = :userId`,
        { replacements: { userId } }
      )
    }

    await sequelize.query(`
      DELETE FROM organization_department_roles
      WHERE organization_id IS NULL AND department_id IS NULL;
    `)

    await sequelize.query(
      `DELETE FROM users WHERE email = :email`,
      { replacements: { email: DEMO_EMAIL } }
    )
  }
}