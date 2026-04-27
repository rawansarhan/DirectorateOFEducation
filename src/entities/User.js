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
      userName: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },

      phone_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
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