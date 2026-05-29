'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AuthChallenge extends Model {
    static associate (models) {
      AuthChallenge.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })

      AuthChallenge.belongsTo(models.UserKey, {
        foreignKey: 'user_key_id',
        as: 'user_key'
      })

      AuthChallenge.belongsTo(models.AuthPinSession, {
        foreignKey: 'pin_session_id',
        as: 'pin_session'
      })
    }
  }

  AuthChallenge.init(
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
      user_key_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      pin_session_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      message_hash: {
        type: DataTypes.STRING(64),
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
      modelName: 'AuthChallenge',
      tableName: 'auth_challenges',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return AuthChallenge
}
