'use strict'

module.exports = (sequelize, DataTypes) => {
  class DocumentFinalTransaction extends sequelize.Sequelize.Model {
    static associate (models) {
      DocumentFinalTransaction.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE'
      })

      DocumentFinalTransaction.belongsTo(models.User, {
        foreignKey: 'generated_by_user_id',
        as: 'generated_by',
        onDelete: 'SET NULL'
      })
    }
  }

  DocumentFinalTransaction.init(
    {
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      file_path: {
        type: DataTypes.STRING(512),
        allowNull: false
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      mime_type: {
        type: DataTypes.STRING(128),
        allowNull: false,
        defaultValue: 'application/pdf'
      },
      file_size_bytes: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      qr_payload_snapshot: {
        type: DataTypes.JSON,
        allowNull: true
      },
      generated_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      generated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'DocumentFinalTransaction',
      tableName: 'document_final_transactions',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return DocumentFinalTransaction
}
