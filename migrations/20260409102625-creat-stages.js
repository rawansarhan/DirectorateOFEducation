'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      process_definition_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'process_definitions',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      camunda_task_key: {
        type: Sequelize.STRING,
        allowNull: true
      },

      order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },

      requires_signature: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },

      end_time: {
        type: Sequelize.DATE,
        allowNull: true
      },

      code: {
        type: Sequelize.STRING,
        allowNull: true
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

  down: async (queryInterface) => {
    await queryInterface.dropTable('stages')
  }
}