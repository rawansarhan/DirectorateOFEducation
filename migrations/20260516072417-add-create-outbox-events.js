'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable('outbox_events', {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },

      event_type: {
        type: Sequelize.STRING,
        allowNull: false
      },

      payload: {
        type: Sequelize.JSON,
        allowNull: false
      },

      status: {
        type: Sequelize.ENUM(
          'pending',
          'processed',
          'failed'
        ),
        defaultValue: 'pending'
      },

      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },

      last_error: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    })
  },

  async down(queryInterface) {

    await queryInterface.dropTable('outbox_events')
  }
}