'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('calculations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      formula: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      result_field: {
        type: Sequelize.STRING,
        allowNull: true
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },

      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    })
  },

  down: async queryInterface => {
    await queryInterface.dropTable('calculations')
  }
}
