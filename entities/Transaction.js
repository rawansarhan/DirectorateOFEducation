'use strict';

module.exports = (sequelize, DataTypes) => {

  class Transaction extends sequelize.Sequelize.Model {
    static associate(models) {

      Transaction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
      });

      Transaction.belongsTo(models.TypeTrans, {
        foreignKey: 'type_trans_id',
        as: 'type_trans',
        onDelete: 'CASCADE',
      });

      Transaction.hasMany(models.ProcessInstanceStage, {
        foreignKey: 'transaction_id',
        as: 'stages',
      });

      Transaction.hasMany(models.DocumentInstance, {
        foreignKey: 'transaction_id',
        as: 'documents',
      });

    }
  }

  Transaction.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      type_trans_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      status: {
        type: DataTypes.ENUM('pending','in_progress','completed','rejected','cancelled'),
        defaultValue: 'pending',
      },

      data: {
        type: DataTypes.JSON,
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
      modelName: 'Transaction',
      tableName: 'transactions',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Transaction;
};