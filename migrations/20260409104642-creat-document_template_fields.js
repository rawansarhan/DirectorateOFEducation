'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('document_template_fields', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      document_template_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'document_templates',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      field_key: {
        type: Sequelize.STRING,
        allowNull: false
      },

      field_type: {
        type: Sequelize.ENUM('string','int','text','date','boolean','float','file'),
        allowNull: false
      },

      pdf_field_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "اسم الحقل في مستند PDF"
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
    await queryInterface.dropTable('document_template_fields')
  }
}