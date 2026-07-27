'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class ProcessInstance extends Model {
    static associate (models) {
      // =========================================
      // PROCESS DEFINITION
      // =========================================
      ProcessInstance.belongsTo(models.ProcessDefinition, {
        foreignKey: 'process_definition_id',
        as: 'process_definition',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })

      ProcessInstance.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction'
      })
      // =========================================
      // CURRENT STAGE
      // =========================================
      ProcessInstance.belongsTo(models.Stage, {
        foreignKey: 'current_stage_id',
        as: 'current_stage',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      })

      ProcessInstance.belongsTo(models.User, {
        foreignKey: 'task_lock_user_id',
        as: 'task_lock_user',
        onDelete: 'SET NULL'
      })
    }
  }

  ProcessInstance.init(
    {
      process_definition_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      camunda_process_instance_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      current_stage_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      status: {
        type: DataTypes.ENUM('running', 'completed', 'cancelled'),
        defaultValue: 'running'
      },

      task_lock_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      task_lock_task_id: {
        type: DataTypes.STRING,
        allowNull: true
      },

      task_locked_at: {
        type: DataTypes.DATE,
        allowNull: true
      },

      task_lock_expires_at: {
        type: DataTypes.DATE,
        allowNull: true
      },

      task_locks: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
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
      modelName: 'ProcessInstance',
      tableName: 'process_instances',

      timestamps: true,
      underscored: true,

      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return ProcessInstance
}
