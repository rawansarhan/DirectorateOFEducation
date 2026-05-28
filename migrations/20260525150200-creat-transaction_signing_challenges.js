'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transaction_signing_challenges', {
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

      task_id: {
        type: Sequelize.STRING,
        allowNull: false
      },

      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'transactions', key: 'id' },
        onDelete: 'CASCADE'
      },

      stage_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'stages', key: 'id' },
        onDelete: 'CASCADE'
      },

      payload_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
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

    await queryInterface.addIndex('transaction_signing_challenges', ['task_id'])
    await queryInterface.addIndex('transaction_signing_challenges', ['user_id'])
    await queryInterface.addIndex('transaction_signing_challenges', ['expires_at'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('transaction_signing_challenges')
  }
}
