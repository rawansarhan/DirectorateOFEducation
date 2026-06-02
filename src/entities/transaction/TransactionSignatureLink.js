'use strict'

module.exports = (sequelize, DataTypes) => {
  class TransactionSignatureLink extends sequelize.Sequelize.Model {
    static associate (models) {
      TransactionSignatureLink.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE'
      })

      TransactionSignatureLink.belongsTo(models.DigitalSignature, {
        foreignKey: 'digital_signature_id',
        as: 'digital_signature',
        onDelete: 'SET NULL'
      })

      TransactionSignatureLink.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      })

      TransactionSignatureLink.belongsTo(models.UserKey, {
        foreignKey: 'user_key_id',
        as: 'user_key',
        onDelete: 'CASCADE'
      })

      TransactionSignatureLink.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE'
      })
    }
  }

  TransactionSignatureLink.init(
    {
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      digital_signature_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      link_order: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      stage_code: {
        type: DataTypes.STRING,
        allowNull: false
      },
      stage_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      stage_data_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      cumulative_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      previous_link_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      link_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      genesis_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      challenge_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      signed_message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      user_key_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      signed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
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
      modelName: 'TransactionSignatureLink',
      tableName: 'transaction_signature_links',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return TransactionSignatureLink
}
