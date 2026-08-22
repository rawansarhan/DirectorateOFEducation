'use strict'

const { defineHistoryModel } = require('./_historyModelFactory')

module.exports = (sequelize, DataTypes) =>
  defineHistoryModel(sequelize, DataTypes, {
    modelName: 'EmployeeReward',
    tableName: 'employee_rewards',
    extraFields: {
      reward_type: { type: DataTypes.STRING(256), allowNull: false },
      reason: { type: DataTypes.STRING(512), allowNull: true },
      document_type: { type: DataTypes.STRING(128), allowNull: true },
      document_number: { type: DataTypes.STRING(128), allowNull: true },
      document_date: { type: DataTypes.DATEONLY, allowNull: true }
    }
  })
