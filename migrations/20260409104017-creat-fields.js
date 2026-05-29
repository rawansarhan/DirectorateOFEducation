'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('fields', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      field_name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      field_type: {
        type: Sequelize.ENUM(
          'string',
          'phoneNumber',
          'int',
          'text',
          'date',
          'boolean',
          'float',
          'choice',
          'multiChoice',
          'action'
        ),
        allowNull: false
      },
      list_json: {
        type: Sequelize.JSON,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    await queryInterface.dropTable('fields')
  }
}
