'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('process_definitions')

    if (!table.is_complaint) {
      await queryInterface.addColumn('process_definitions', 'is_complaint', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    }

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_process_complaint_active
      ON process_definitions (is_complaint, status, approval_status, is_active)
      WHERE is_complaint = true;
    `)

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_process_type_trans_active
      ON process_definitions (type_trans_id, status, approval_status, is_active)
      WHERE type_trans_id IS NOT NULL;
    `)

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_odr_citizen_lookup
      ON organization_department_roles (role_id, organization_id, department_id)
      WHERE organization_id IS NULL AND department_id IS NULL;
    `)

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_code
      ON roles (code);
    `)
  },

  async down (queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_process_complaint_active;')
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_process_type_trans_active;')
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_odr_citizen_lookup;')
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_roles_code;')

    const table = await queryInterface.describeTable('process_definitions')

    if (table.is_complaint) {
      await queryInterface.removeColumn('process_definitions', 'is_complaint')
    }
  }
}
