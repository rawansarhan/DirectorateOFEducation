'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('process_instances', {
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

      camunda_process_instance_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },

      current_stage_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'stages',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },

      status: {
        type: Sequelize.ENUM('running', 'completed'),
        allowNull: false,
        defaultValue: 'running'
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

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('process_instances')
  }
};
