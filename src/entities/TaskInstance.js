'use strict';

module.exports = (sequelize, DataTypes) => {

  class TaskInstance extends sequelize.Sequelize.Model {
    static associate(models) {

      TaskInstance.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE',
      });

      TaskInstance.belongsTo(models.User, {
        foreignKey: 'assigned_to',
        as: 'assignee',
      });

    }
  }

  TaskInstance.init(
    {
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      camunda_task_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      camunda_task_key: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM('pending','in_progress','completed','cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },

      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'TaskInstance',
      tableName: 'task_instance',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return TaskInstance;
};