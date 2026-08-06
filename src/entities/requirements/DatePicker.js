'use strict'

module.exports = (sequelize, DataTypes) => {
  class DatePicker extends sequelize.Sequelize.Model {
    static associate () {}
  }

  DatePicker.init(
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
      min_date: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      max_date: {
        type: DataTypes.STRING(255),
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
      modelName: 'DatePicker',
      tableName: 'date_pickers',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return DatePicker
}
