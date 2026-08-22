'use strict'

function defineHistoryModel (sequelize, DataTypes, {
  modelName,
  tableName,
  extraFields = {},
  associateAs
}) {
  class HistoryModel extends sequelize.Sequelize.Model {
    static associate (models) {
      HistoryModel.belongsTo(models.EmployeeSelfCard, {
        foreignKey: 'self_card_id',
        as: 'self_card',
        onDelete: 'CASCADE'
      })

      HistoryModel.belongsTo(models.Transaction, {
        foreignKey: 'source_transaction_id',
        as: 'source_transaction',
        onDelete: 'SET NULL'
      })

      HistoryModel.belongsTo(models.User, {
        foreignKey: 'registered_by',
        as: 'registrar',
        onDelete: 'SET NULL'
      })
    }
  }

  HistoryModel.init(
    {
      self_card_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      source_transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      source_stage_code: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      source_content_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      registered_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      ...extraFields
    },
    {
      sequelize,
      modelName,
      tableName,
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return HistoryModel
}

module.exports = { defineHistoryModel }
