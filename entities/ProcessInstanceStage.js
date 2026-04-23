'use strict';

module.exports = (sequelize, DataTypes) => {

  class ProcessInstanceStage extends sequelize.Sequelize.Model {
    static associate(models) {

      ProcessInstanceStage.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE',
      });

      ProcessInstanceStage.belongsTo(models.User, {
        foreignKey: 'assigned_to',
        as: 'assignee',
      });

    }
  }

  ProcessInstanceStage.init(
    {
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      stage_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      stage_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      data: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM('pending','in_progress','completed','rejected'),
        defaultValue: 'pending',
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
      modelName: 'ProcessInstanceStage',
      tableName: 'process_instance_stage',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ProcessInstanceStage;
};