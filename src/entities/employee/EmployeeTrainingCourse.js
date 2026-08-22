'use strict'

const { defineHistoryModel } = require('./_historyModelFactory')

module.exports = (sequelize, DataTypes) =>
  defineHistoryModel(sequelize, DataTypes, {
    modelName: 'EmployeeTrainingCourse',
    tableName: 'employee_training_courses',
    extraFields: {
      title: { type: DataTypes.STRING(256), allowNull: false },
      provider: { type: DataTypes.STRING(256), allowNull: true },
      topic: { type: DataTypes.STRING(256), allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      duration: { type: DataTypes.STRING(64), allowNull: true },
      certificate_number: { type: DataTypes.STRING(128), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      normalized_title: { type: DataTypes.STRING(256), allowNull: true }
    }
  })
