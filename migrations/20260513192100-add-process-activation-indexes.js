'use strict'

module.exports = {

  async up(queryInterface) {

    await queryInterface.addIndex(

      'process_definitions',

      [
        'approval_status',
        'is_active',
        'start_date'
      ],

      {
        name:
          'idx_process_activation'
      }
    )

    await queryInterface.addIndex(

      'process_definitions',

      [
        'is_active',
        'end_date'
      ],

      {
        name:
          'idx_process_deactivation'
      }
    )
  },

  async down(queryInterface) {

    await queryInterface.removeIndex(
      'process_definitions',
      'idx_process_activation'
    )

    await queryInterface.removeIndex(
      'process_definitions',
      'idx_process_deactivation'
    )
  }
}