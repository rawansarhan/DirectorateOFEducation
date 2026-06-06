'use strict'

module.exports = (sequelize, DataTypes) => {
  class FilePicker extends sequelize.Sequelize.Model {
    static associate () {}
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
