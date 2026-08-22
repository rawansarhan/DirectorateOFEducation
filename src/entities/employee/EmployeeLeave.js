'use strict'

const { defineHistoryModel } = require('./_historyModelFactory')

module.exports = (sequelize, DataTypes) =>
  defineHistoryModel(sequelize, DataTypes, {
    modelName: 'EmployeeLeave',
    tableName: 'employee_leaves',
    extraFields: {
      leave_type: { type: DataTypes.STRING(256), allowNull: false },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      duration: { type: DataTypes.STRING(64), allowNull: true },
      reason: { type: DataTypes.STRING(512), allowNull: true },
      document_type: { type: DataTypes.STRING(128), allowNull: true },
      document_number: { type: DataTypes.STRING(128), allowNull: true },
      document_date: { type: DataTypes.DATEONLY, allowNull: true }
    }
  })
