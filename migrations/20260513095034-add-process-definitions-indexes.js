'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {

    // 🔥 index للفلترة الأساسية (الأهم)
    await queryInterface.addIndex(
      'process_definitions',
      [
        'type_trans_id',
        'status',
        'approval_status',
        'is_active'
      ],
      {
        name: 'idx_process_filter'
      }
    )

    // 🔥 index للـ code (unique search)
    await queryInterface.addIndex(
      'process_definitions',
      ['code'],
      {
        unique: true,
        name: 'idx_process_code'
      }
    )

    // 🔥 index للـ organization (اختياري بس مفيد)
    await queryInterface.addIndex(
      'process_definitions',
      ['organization_id'],
      {
        name: 'idx_process_org'
      }
    )
  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeIndex(
      'process_definitions',
      'idx_process_filter'
    )

    await queryInterface.removeIndex(
      'process_definitions',
      'idx_process_code'
    )

    await queryInterface.removeIndex(
      'process_definitions',
      'idx_process_org'
    )
  }
}