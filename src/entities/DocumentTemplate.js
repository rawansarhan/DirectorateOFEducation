'use strict';

module.exports = (sequelize, DataTypes) => {
  class DocumentTemplate extends sequelize.Sequelize.Model {
    static associate(models) {

    }
  }

  DocumentTemplate.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      file_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      file_type: {
        type: DataTypes.ENUM('pdf', 'docx', 'html'),
        allowNull: false,
      },

      engine_type: {
        type: DataTypes.ENUM('ACROFORM', 'POSITIONED'),
        defaultValue: 'ACROFORM',
        allowNull: false,
      },

      config_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      is_latest: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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
      modelName: 'DocumentTemplate',
      tableName: 'document_templates',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return DocumentTemplate;
};