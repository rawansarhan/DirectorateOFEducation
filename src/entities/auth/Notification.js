'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate (models) {
      Notification.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'recipient'
      })

      Notification.belongsTo(models.User, {
        foreignKey: 'sent_by_user_id',
        as: 'sender'
      })

      Notification.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction'
      })

      Notification.belongsTo(models.ProcessInstance, {
        foreignKey: 'process_instance_id',
        as: 'process_instance'
      })
    }
  }

  Notification.init(
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
      sent_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      channel: {
        type: DataTypes.ENUM('firebase', 'in_app'),
        allowNull: false,
        defaultValue: 'firebase'
      },
      status: {
        type: DataTypes.ENUM('sent', 'partial', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'skipped'
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      process_instance_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      sent_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      failed_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return Notification
}
