'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('process_instances', 'task_locks', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {}
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('process_instances', 'task_locks')
  }
}
