'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('document_templates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },

      file_type: {
        type: Sequelize.ENUM('pdf', 'docx', 'html'),
        allowNull: false
      },

      engine_type: {
        type: Sequelize.ENUM('ACROFORM', 'POSITIONED'),
        defaultValue: 'ACROFORM',
        allowNull: false
      },

      config_json: {
        type: Sequelize.JSON,
        allowNull: true
      },

      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },

      is_latest: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
  },

  down: async queryInterface => {
    await queryInterface.dropTable('document_templates')
  }
}
