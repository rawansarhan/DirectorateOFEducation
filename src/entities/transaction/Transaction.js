'use strict'

module.exports = (sequelize, DataTypes) => {
  class Transaction extends sequelize.Sequelize.Model {
    static associate (models) {
      Transaction.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      })

      Transaction.hasMany(models.ProcessInstanceStage, {
        foreignKey: 'transaction_id',
        as: 'stages'
      })

      Transaction.hasMany(models.DocumentInstance, {
        foreignKey: 'transaction_id',
        as: 'documents'
      })

      Transaction.hasMany(models.TransactionSignatureLink, {
        foreignKey: 'transaction_id',
        as: 'signature_links'
      })
    }
  }

  Transaction.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      code: {
        type: DataTypes.STRING,
        allowNull: true
      },

      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },

      status: {
        type: DataTypes.ENUM(
          'draft',
          'submitted',
          'in_progress',
          'completed',
          'rejected',
          'cancelled'
        ),
        defaultValue: 'draft'
      },

      data: {
        type: DataTypes.JSON,
        allowNull: true
      },

      genesis_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
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
      modelName: 'Transaction',
      tableName: 'transactions',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return Transaction
}
