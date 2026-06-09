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
        allowNull: false
      },
      challenge_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      stage_code: {
        type: DataTypes.STRING,
        allowNull: true
      },
      signature_order: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      stage_data_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      cumulative_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      link_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      previous_link_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      genesis_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      signed_at: {
        type: DataTypes.DATE,
        allowNull: false
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
