'use strict';

module.exports = (sequelize, DataTypes) => {

  class DocumentTemplateField extends sequelize.Sequelize.Model {
    static associate(models) {

      DocumentTemplateField.belongsTo(models.DocumentTemplate, {
        foreignKey: 'document_template_id',
        as: 'document_template',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  DocumentTemplateField.init(
    {
      document_template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      field_key: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      field_type: {
        type: DataTypes.ENUM('string','int','text','date','boolean','float','file'),
        allowNull: false,
      },

      pdf_field_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'DocumentTemplateField',
      tableName: 'document_template_fields',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return DocumentTemplateField;
};