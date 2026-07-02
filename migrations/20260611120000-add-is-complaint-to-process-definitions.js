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
      UPDATE process_definitions
      SET is_complaint = true
      WHERE type_trans_id = 1
    `)

    try {
      await queryInterface.addIndex(
        'process_definitions',
        ['is_complaint', 'status', 'approval_status', 'is_active'],
        {
          name: 'idx_process_complaint_filter'
        }
      )
    } catch (error) {
      if (!String(error.message).includes('already exists')) {
        throw error
      }
    }
  },

  async down (queryInterface) {
    try {
      await queryInterface.removeIndex(
        'process_definitions',
        'idx_process_complaint_filter'
      )
    } catch (_) {}

    const table = await queryInterface.describeTable('process_definitions')

    if (table.is_complaint) {
      await queryInterface.removeColumn('process_definitions', 'is_complaint')
    }
  }
}
