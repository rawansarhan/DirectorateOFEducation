'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate (models) {
      AuditLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })
    }
  }

  AuditLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false
      },
      resource_type: {
        type: DataTypes.STRING,
        allowNull: true
      },
      resource_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('success', 'failure', 'blocked'),
        allowNull: false,
        defaultValue: 'success'
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false
    }
  )

  return AuditLog
}
