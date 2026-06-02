'use strict'

/**
 * Indexes لجلب شكاوى المواطن (is_complaint=true, type_trans_id IS NULL, CITIZEN assignment)
 */
module.exports = {
  async up (queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_process_citizen_complaint
      ON process_definitions (status, approval_status, is_active, priority)
      WHERE is_complaint = true AND type_trans_id IS NULL;
    `)

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_stage_assignment_citizen_auth
      ON stage_assignments (organization_department_roles_id, stage_id)
      WHERE organization_department_roles_id IS NOT NULL;
    `)
  },

  async down (queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_process_citizen_complaint;')
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_stage_assignment_citizen_auth;')
  }
}
