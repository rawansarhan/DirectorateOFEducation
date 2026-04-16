'use strict'
//يمثل الملفات الموقعة رقمياً أو مرفوعة.
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('document_signature', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'transactions', key: 'id' },
        onDelete: 'CASCADE'
      },

      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },

      file_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "SHA256 hash للملف"
      },

      file_type: {
        type: Sequelize.ENUM('generated','signed','stamped'),
        allowNull: false
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
    await queryInterface.dropTable('document_signature')
  }
}