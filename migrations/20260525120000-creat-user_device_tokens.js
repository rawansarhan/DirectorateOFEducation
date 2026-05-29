'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_device_tokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },

      fcm_token: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true
      },

      device_id: {
        type: Sequelize.STRING,
        allowNull: true
      },

      platform: {
        type: Sequelize.STRING,
        allowNull: true
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

    await queryInterface.addIndex('user_device_tokens', ['user_id'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_device_tokens')
  }
}
