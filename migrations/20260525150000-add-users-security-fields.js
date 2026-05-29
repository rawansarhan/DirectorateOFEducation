'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'security_failed_attempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    })

    await queryInterface.addColumn('users', 'security_locked_until', {
      type: Sequelize.DATE,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'security_locked_until')
    await queryInterface.removeColumn('users', 'security_failed_attempts')
  }
}
