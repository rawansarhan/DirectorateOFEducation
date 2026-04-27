'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('process_definitions', {
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

      code: {
        type: Sequelize.STRING,
        allowNull: true
      },

      camunda_process_key: {
        type: Sequelize.STRING,
        allowNull: true
      },

      camunda_deployment_id: {
        type: Sequelize.STRING,
        allowNull: true
      },

      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },

      status: {
        type: Sequelize.ENUM('draft', 'deployed'),
        defaultValue: 'draft'
      },

      bpmn_xml: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },

      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },

      type_trans_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'type_trans',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },

      start_date: {
        type: Sequelize.DATE,
        allowNull: true
      },

      end_date: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable('process_definitions')
  }
}