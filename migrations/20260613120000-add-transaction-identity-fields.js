'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('transactions')

    const columns = {
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      father_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      mother_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      national_id: {
        type: Sequelize.STRING(50),
        allowNull: true
      }
    }

    for (const [name, definition] of Object.entries(columns)) {
      if (!table[name]) {
        await queryInterface.addColumn('transactions', name, definition)
      }
    }
  },

  async down (queryInterface) {
    const table = await queryInterface.describeTable('transactions')
    const names = ['first_name', 'last_name', 'father_name', 'mother_name', 'national_id']

    for (const name of names) {
      if (table[name]) {
        await queryInterface.removeColumn('transactions', name)
      }
    }
  }
}
