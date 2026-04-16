'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stage_calculations', {
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

      name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      calculation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'calculations',
          key: 'id'
        },
        onDelete: 'CASCADE'
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
    await queryInterface.dropTable('stage_calculations')
  }
}