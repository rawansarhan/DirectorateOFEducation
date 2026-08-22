'use strict'

const { defineHistoryModel } = require('./_historyModelFactory')

module.exports = (sequelize, DataTypes) =>
  defineHistoryModel(sequelize, DataTypes, {
    modelName: 'EmployeeSanction',
    tableName: 'employee_sanctions',
    extraFields: {
      sanction_type: { type: DataTypes.STRING(256), allowNull: false },
      reason: { type: DataTypes.STRING(512), allowNull: true },
      document_type: { type: DataTypes.STRING(128), allowNull: true },
      document_number: { type: DataTypes.STRING(128), allowNull: true },
      document_date: { type: DataTypes.DATEONLY, allowNull: true }
    }
  })
