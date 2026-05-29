'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user_key', 'algorithm', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'ed25519'
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('user_key', 'algorithm')
  }
}
