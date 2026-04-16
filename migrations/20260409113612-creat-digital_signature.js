'use strict'
//يمثل التوقيع الرقمي على المستند
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('digital_signature', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      document_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'document_signature', key: 'id' },
        onDelete: 'CASCADE'
      },

      user_key_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'user_key', key: 'id' },
        onDelete: 'CASCADE'
      },

      signature_order: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },

      previous_signature_hash: {
        type: Sequelize.STRING,
        allowNull: true
      },

      signed_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },

      signature_value: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      signed_at: {
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
    await queryInterface.dropTable('digital_signature')
  }
}