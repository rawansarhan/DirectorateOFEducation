'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stagefield_fields', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      stage_field_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stage_fields',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      field_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fields',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      required: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.dropTable('stagefield_fields')
  }
}