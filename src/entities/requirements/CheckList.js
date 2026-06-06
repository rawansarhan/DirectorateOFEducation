'use strict'

module.exports = (sequelize, DataTypes) => {
  class CheckList extends sequelize.Sequelize.Model {
    static associate () {}
  }

  CheckList.init(
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
      min_selected: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      max_selected: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
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
      modelName: 'CheckList',
      tableName: 'check_lists',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return CheckList
}
