'use strict'
//لتخزين نتيجة التحقق من التوقيع الرقمي
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('signature_verification', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      document_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'document_instance', key: 'id' },
        onDelete: 'CASCADE'
      },

      is_valid: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },

      details: {
        type: Sequelize.JSON,
        allowNull: true
      },

      checked_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
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
    await queryInterface.dropTable('signature_verification')
  }
}