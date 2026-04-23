'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stage_transitions', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
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

      from_stage_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stages',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      to_stage_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stages',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      
      //هون بحط اسم ال botton

      action: {
        type: Sequelize.Text,
        allowNull: false
      },

      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },

      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('stage_transitions')
  }
}