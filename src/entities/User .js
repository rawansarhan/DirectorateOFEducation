'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // 🔗 العلاقات (تضيفها لاحقًا حسب النظام)

      // User ↔ Role Assignments
      User.hasMany(models.UserRoleAssignment, {
        foreignKey: 'user_id',
        as: 'role_assignments'
      })

      // User ↔ Transactions
      User.hasMany(models.Transaction, {
        foreignKey: 'user_id',
        as: 'transactions'
      })

      // User ↔ TaskInstance (assigned tasks)
      User.hasMany(models.TaskInstance, {
        foreignKey: 'assigned_to',
        as: 'tasks'
      })

      // User ↔ UserKey (digital signature)
      User.hasMany(models.UserKey, {
        foreignKey: 'user_id',
        as: 'keys'
      })
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

   

      userNsme: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },

      first_name_ar: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      last_name_ar: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      first_name_en: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      last_name_en: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      father_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      mother_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
      },

      marital_status: {
        type: DataTypes.ENUM('single', 'married'),
        allowNull: true,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true
        }
      },

      phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      family_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return User
}