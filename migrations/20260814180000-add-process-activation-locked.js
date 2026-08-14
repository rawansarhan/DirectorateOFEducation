'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('process_definitions', 'activation_locked', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'true = الأدمن ثبّت is_active يدوياً ولا يعيد جدول التواريخ كتابته'
    })
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('process_definitions', 'activation_locked')
  }
}
