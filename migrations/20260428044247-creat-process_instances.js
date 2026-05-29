'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('process_instances', {

      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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

            transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'transactions',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      camunda_process_instance_id: {
        type: Sequelize.STRING,
        allowNull: false
      },

      current_stage_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'stages',
          key: 'id'
        }
      },

      status: {
        type: Sequelize.ENUM(
          'running',
          'completed',
          'cancelled'
        ),
        defaultValue: 'running'
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

  async down(queryInterface) {
    await queryInterface.dropTable('process_instances')
  }
}