'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('audit_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
      },

      action: {
        type: Sequelize.STRING,
        allowNull: false
      },

      resource_type: {
        type: Sequelize.STRING,
        allowNull: true
      },

      resource_id: {
        type: Sequelize.STRING,
        allowNull: true
      },

      status: {
        type: Sequelize.ENUM('success', 'failure', 'blocked'),
        allowNull: false,
        defaultValue: 'success'
      },

      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },

      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      details: {
        type: Sequelize.JSON,
        allowNull: true
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    })

    await queryInterface.addIndex('audit_logs', ['user_id'])
    await queryInterface.addIndex('audit_logs', ['action'])
    await queryInterface.addIndex('audit_logs', ['created_at'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('audit_logs')
  }
}
