'use strict'

const { defineHistoryModel } = require('./_historyModelFactory')

module.exports = (sequelize, DataTypes) =>
  defineHistoryModel(sequelize, DataTypes, {
    modelName: 'EmployeeIrregularAbsence',
    tableName: 'employee_irregular_absences',
    extraFields: {
      duration: { type: DataTypes.STRING(64), allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      document_type: { type: DataTypes.STRING(128), allowNull: true },
      document_number: { type: DataTypes.STRING(128), allowNull: true },
      document_date: { type: DataTypes.DATEONLY, allowNull: true }
    }
  })
