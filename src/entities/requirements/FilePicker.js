'use strict'

module.exports = (sequelize, DataTypes) => {
  class FilePicker extends sequelize.Sequelize.Model {
    static associate (models) {
      FilePicker.belongsTo(models.TypeDoc, {
        foreignKey: 'type_doc_id',
        as: 'type_doc'
      })
    }
  }

  FilePicker.init(
    {
      id_widget: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true
      },
      label: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      max_size_mb: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      allowed_extensions: {
        type: DataTypes.JSON,
        allowNull: false
      },
      allow_multiple: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      type_doc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'type_docs',
          key: 'id'
        }
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'FilePicker',
      tableName: 'file_pickers',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return FilePicker
}
