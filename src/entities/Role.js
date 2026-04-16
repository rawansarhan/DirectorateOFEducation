'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {

      Role.hasMany(models.OrgDeptRole, {
        foreignKey: 'role_id',
        as: 'organization_roles'
      })

      Role.hasMany(models.StageAssignment, {
        foreignKey: 'role_id',
        as: 'stage_assignments'
      })
    }
  }

  Role.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },

      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }
    },
    {
      sequelize,
      modelName: 'Role',
      tableName: 'roles',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return Role
}