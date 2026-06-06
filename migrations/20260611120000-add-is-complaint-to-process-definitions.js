'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('process_definitions', 'is_complaint', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    await queryInterface.sequelize.query(`
      UPDATE process_definitions
      SET is_complaint = true
      WHERE type_trans_id = 1
    `)

    await queryInterface.addIndex(
      'process_definitions',
      ['is_complaint', 'status', 'approval_status', 'is_active'],
      {
        name: 'idx_process_complaint_filter'
      }
    )
  },

  async down (queryInterface) {
    await queryInterface.removeIndex(
      'process_definitions',
      'idx_process_complaint_filter'
    )

    await queryInterface.removeColumn('process_definitions', 'is_complaint')
  }
}
