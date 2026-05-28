'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('auth_pin_sessions', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },

      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },

      used_at: {
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

    await queryInterface.addIndex('auth_pin_sessions', ['user_id'])
    await queryInterface.addIndex('auth_pin_sessions', ['expires_at'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('auth_pin_sessions')
  }
}
