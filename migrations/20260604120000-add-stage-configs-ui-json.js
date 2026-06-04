'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stage_configs', 'ui_json', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {}
    })
  },

  down: async queryInterface => {
    await queryInterface.removeColumn('stage_configs', 'ui_json')
  }
}
