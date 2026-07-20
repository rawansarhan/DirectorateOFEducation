'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('transactions')

    if (!table.verification_pin) {
      await queryInterface.addColumn('transactions', 'verification_pin', {
        type: Sequelize.STRING(6),
        allowNull: true,
        unique: true
      })
    }
  },

  async down (queryInterface) {
    const table = await queryInterface.describeTable('transactions')

    if (table.verification_pin) {
      await queryInterface.removeColumn('transactions', 'verification_pin')
    }
  }
}
