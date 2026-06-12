'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
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
        onDelete: 'CASCADE',
        comment: 'Recipient user (who the notification was sent to)'
      },

      sent_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        comment: 'User who triggered the notification (e.g. employee who rejected)'
      },

      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },

      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Notification type code, e.g. transaction_rejected'
      },

      channel: {
        type: Sequelize.ENUM('firebase', 'in_app'),
        allowNull: false,
        defaultValue: 'firebase'
      },

      status: {
        type: Sequelize.ENUM('sent', 'partial', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'skipped'
      },

      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'transactions', key: 'id' },
        onDelete: 'SET NULL'
      },

      process_instance_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'process_instances', key: 'id' },
        onDelete: 'SET NULL'
      },

      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Extra payload (FCM data, skip reason, etc.)'
      },

      sent_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      failed_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      read_at: {
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

    await queryInterface.addIndex('notifications', ['user_id'])
    await queryInterface.addIndex('notifications', ['sent_by_user_id'])
    await queryInterface.addIndex('notifications', ['transaction_id'])
    await queryInterface.addIndex('notifications', ['type'])
    await queryInterface.addIndex('notifications', ['created_at'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('notifications')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_channel";')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_status";')
  }
}
