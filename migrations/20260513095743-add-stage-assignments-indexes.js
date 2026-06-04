'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addIndex(
      'stage_assignments',
      ['stage_id', 'organization_department_roles_id'],
      {
        name: 'idx_stage_assignment_stage_role'
      }
    )

    await queryInterface.addIndex(
      'stage_assignments',
      ['organization_department_roles_id'],
      {
        name: 'idx_stage_assignment_role'
      }
    )
  },

  async down(queryInterface) {

    await queryInterface.removeIndex(
      'stage_assignments',
      'idx_stage_assignment_stage_role'
    )

    await queryInterface.removeIndex(
      'stage_assignments',
      'idx_stage_assignment_role'
    )
  }
}