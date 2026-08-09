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

      Transaction.hasOne(models.ProcessInstance, {
        foreignKey: 'transaction_id',
        as: 'process_instance'
      })

      Transaction.hasMany(models.DocumentInstance, {
        foreignKey: 'transaction_id',
        as: 'documents'
      })

      Transaction.hasMany(models.TransactionSignatureLink, {
        foreignKey: 'transaction_id',
        as: 'signature_links'
      })

      Transaction.hasOne(models.DocumentFinalTransaction, {
        foreignKey: 'transaction_id',
        as: 'final_document'
      })

      Transaction.hasMany(models.DocumentSignature, {
        foreignKey: 'transaction_id',
        as: 'document_signatures'
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

      id_process: {
        type: DataTypes.STRING(32),
        allowNull: true,
        unique: true
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
          'rejected'
        ),
        defaultValue: 'draft'
      },

      data: {
        type: DataTypes.JSON,
        allowNull: true
      },

      first_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },

      last_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },

      father_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },

      mother_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },

      national_id: {
        type: DataTypes.STRING(50),
        allowNull: true
      },

      genesis_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
      },

      verification_pin: {
        type: DataTypes.STRING(6),
        allowNull: true,
        unique: true
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
