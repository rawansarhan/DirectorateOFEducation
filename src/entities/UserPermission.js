'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class UserPermission extends Model {
    static associate (models) {
      UserPermission.belongsTo(models.User, {
        foreignKey: 'user_id',
        onDelete: 'CASCADE'
      })
      UserPermission.belongsTo(models.Permission, {
        foreignKey: 'permission_id',
        onDelete: 'CASCADE'
      })
    }
  }

  UserPermission.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      permission_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      }
    },
    {
      sequelize,
      modelName: 'UserPermission',
      tableName: 'user_permissions',
      timestamps: false
    }
  )

  return UserPermission
}
