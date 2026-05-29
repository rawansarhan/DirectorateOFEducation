'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'pin_hash', {
      type: Sequelize.STRING,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'pin_hash')
  }
}
