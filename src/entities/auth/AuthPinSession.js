'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AuthPinSession extends Model {
    static associate (models) {
      AuthPinSession.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })

      AuthPinSession.hasMany(models.AuthChallenge, {
        foreignKey: 'pin_session_id',
        as: 'challenges'
      })
    }
  }

  AuthPinSession.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'AuthPinSession',
      tableName: 'auth_pin_sessions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return AuthPinSession
}
