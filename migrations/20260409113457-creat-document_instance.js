'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('document_instance', {
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

      generated_pdf_path: {
        type: Sequelize.STRING,
        allowNull: false
      },

      status: {
        type: Sequelize.ENUM('generated','signed','stamped','archived'),
        defaultValue: 'generated'
      },

      data_json: {
        type: Sequelize.JSON,
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('document_instance')
  }
}