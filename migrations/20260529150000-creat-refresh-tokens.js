'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('refresh_tokens', {
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

      token_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },

      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },

      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },

      replaced_by_id: {
        type: Sequelize.UUID,
        allowNull: true
      },

      user_agent: {
        type: Sequelize.STRING,
        allowNull: true
      },

      ip_address: {
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

    await queryInterface.addIndex('refresh_tokens', ['user_id'])
    await queryInterface.addIndex('refresh_tokens', ['token_hash'])
    await queryInterface.addIndex('refresh_tokens', ['expires_at'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('refresh_tokens')
  }
}
