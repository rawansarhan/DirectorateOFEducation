'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class UserDeviceToken extends Model {
    static associate (models) {
      UserDeviceToken.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })
    }
  }

  UserDeviceToken.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      fcm_token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
      },
      device_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      platform: {
        type: DataTypes.STRING,
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'UserDeviceToken',
      tableName: 'user_device_tokens',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return UserDeviceToken
}
