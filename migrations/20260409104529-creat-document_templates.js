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

      stage_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'stages',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      file_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'type_file',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      file_path: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "مسار الملف الأساسي (DOCX أو HTML أو أي صيغة قابلة للتحويل لـ PDF)"
      },

      engine_type: {
        type: Sequelize.ENUM('ACROFORM', 'POSITIONED'),
        defaultValue: 'ACROFORM',
        allowNull: false
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

  down: async (queryInterface) => {
    await queryInterface.dropTable('document_templates')
  }
}