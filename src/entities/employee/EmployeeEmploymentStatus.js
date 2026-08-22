'use strict'

const { defineHistoryModel } = require('./_historyModelFactory')

module.exports = (sequelize, DataTypes) =>
  defineHistoryModel(sequelize, DataTypes, {
    modelName: 'EmployeeEmploymentStatus',
    tableName: 'employee_employment_statuses',
    extraFields: {
      work_center: { type: DataTypes.STRING(256), allowNull: true },
      job_title: { type: DataTypes.STRING(256), allowNull: true },
      job_type: { type: DataTypes.STRING(128), allowNull: true },
      category: { type: DataTypes.STRING(128), allowNull: true },
      salary: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      emergency_change_date: { type: DataTypes.DATEONLY, allowNull: true },
      document_reason: { type: DataTypes.STRING(512), allowNull: true },
      document_type: { type: DataTypes.STRING(128), allowNull: true },
      document_number: { type: DataTypes.STRING(128), allowNull: true },
      document_date: { type: DataTypes.DATEONLY, allowNull: true }
    }
  })
