'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class TransactionSigningChallenge extends Model {
    static associate (models) {
      TransactionSigningChallenge.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })

      TransactionSigningChallenge.belongsTo(models.UserKey, {
        foreignKey: 'user_key_id',
        as: 'user_key'
      })

      TransactionSigningChallenge.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction'
      })

      TransactionSigningChallenge.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage'
      })
    }
  }

  TransactionSigningChallenge.init(
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
      task_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      payload_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      stage_data_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      payload_snapshot: {
        type: DataTypes.JSON,
        allowNull: true
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
      modelName: 'TransactionSigningChallenge',
      tableName: 'transaction_signing_challenges',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return TransactionSigningChallenge
}
