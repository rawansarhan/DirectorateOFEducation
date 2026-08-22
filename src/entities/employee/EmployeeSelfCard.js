'use strict'

module.exports = (sequelize, DataTypes) => {
  class EmployeeSelfCard extends sequelize.Sequelize.Model {
    static associate (models) {
      EmployeeSelfCard.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      })

      EmployeeSelfCard.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization',
        onDelete: 'SET NULL'
      })

      EmployeeSelfCard.hasMany(models.EmployeeTrainingCourse, {
        foreignKey: 'self_card_id',
        as: 'training_courses'
      })

      EmployeeSelfCard.hasMany(models.EmployeeEmploymentStatus, {
        foreignKey: 'self_card_id',
        as: 'employment_statuses'
      })

      EmployeeSelfCard.hasMany(models.EmployeeIrregularAbsence, {
        foreignKey: 'self_card_id',
        as: 'irregular_absences'
      })

      EmployeeSelfCard.hasMany(models.EmployeeLeave, {
        foreignKey: 'self_card_id',
        as: 'leaves'
      })

      EmployeeSelfCard.hasMany(models.EmployeeReward, {
        foreignKey: 'self_card_id',
        as: 'rewards'
      })

      EmployeeSelfCard.hasMany(models.EmployeeSanction, {
        foreignKey: 'self_card_id',
        as: 'sanctions'
      })
    }
  }

  EmployeeSelfCard.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
      },
      organization_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      self_number: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      national_id: {
        type: DataTypes.STRING(32),
        allowNull: true
      },
      insurance_number: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      full_name: {
        type: DataTypes.STRING(256),
        allowNull: true
      },
      father_name: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      mother_name: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      birth_place: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      registry_place: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      registry_number: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      gender: {
        type: DataTypes.STRING(32),
        allowNull: true
      },
      nationality: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      foreign_language: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      education_degree: {
        type: DataTypes.STRING(256),
        allowNull: true
      },
      current_residence: {
        type: DataTypes.STRING(512),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'EmployeeSelfCard',
      tableName: 'employee_self_cards',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return EmployeeSelfCard
}
