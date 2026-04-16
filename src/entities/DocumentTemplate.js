'use strict';

module.exports = (sequelize, DataTypes) => {

  class DocumentTemplate extends sequelize.Sequelize.Model {
    static associate(models) {

      DocumentTemplate.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      DocumentTemplate.belongsTo(models.TypeFile, {
        foreignKey: 'file_type_id',
        as: 'file_type',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  DocumentTemplate.init(
    {
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      file_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      file_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      engine_type: {
        type: DataTypes.ENUM('ACROFORM', 'POSITIONED'),
        allowNull: false,
        defaultValue: 'ACROFORM',
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