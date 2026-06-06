'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('stage_configs')

    if (table.ui_json) {
      await queryInterface.removeColumn('stage_configs', 'ui_json')
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('stage_configs')

    if (!table.ui_json) {
      await queryInterface.addColumn('stage_configs', 'ui_json', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      })
    }
  }
}
