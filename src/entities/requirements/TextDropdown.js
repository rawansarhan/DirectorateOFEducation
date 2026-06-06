'use strict'

module.exports = (sequelize, DataTypes) => {
  class TextDropdown extends sequelize.Sequelize.Model {
    static associate () {}
  }

  TextDropdown.init(
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
      options: {
        type: DataTypes.JSON,
        allowNull: false
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
      modelName: 'TextDropdown',
      tableName: 'text_dropdowns',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return TextDropdown
}
