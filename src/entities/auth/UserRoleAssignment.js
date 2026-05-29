'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {

  class UserRoleAssignment extends Model {
    static associate(models) {

      UserRoleAssignment.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      })

      UserRoleAssignment.belongsTo(models.OrgDeptRole, {
        foreignKey: 'organization_department_roles_id',
        as: 'org_department_role',
        onDelete: 'CASCADE'
      })

    }
  }

  UserRoleAssignment.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      organization_department_roles_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'UserRoleAssignment',
      tableName: 'user_role_assignments',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return UserRoleAssignment
}