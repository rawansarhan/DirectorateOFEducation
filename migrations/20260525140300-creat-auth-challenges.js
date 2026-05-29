'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('auth_challenges', {
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

      user_key_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'user_key', key: 'id' },
        onDelete: 'CASCADE'
      },

      pin_session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'auth_pin_sessions', key: 'id' },
        onDelete: 'CASCADE'
      },

      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      message_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
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

    await queryInterface.addIndex('auth_challenges', ['pin_session_id'])
    await queryInterface.addIndex('auth_challenges', ['expires_at'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('auth_challenges')
  }
}
