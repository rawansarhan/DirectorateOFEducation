'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stage_rules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      stage_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stages',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },

      condition_expression: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      next_stage_code: {
        type: Sequelize.STRING,
        allowNull: false
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    await queryInterface.dropTable('stage_rules')
  }
}