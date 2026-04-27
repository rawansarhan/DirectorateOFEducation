'use strict'

module.exports = (sequelize, DataTypes) => {
  class OrgDeptRole extends sequelize.Sequelize.Model {
    static associate (models) {
      OrgDeptRole.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role',
        onDelete: 'CASCADE'
      })

      OrgDeptRole.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization',
        onDelete: 'CASCADE'
      })

      OrgDeptRole.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department',
        onDelete: 'CASCADE'
      })

      OrgDeptRole.belongsTo(models.OrgDeptRole, {
        foreignKey: 'parent_id',
        as: 'parent',
        onDelete: 'SET NULL'
      })

      OrgDeptRole.hasMany(models.OrgDeptRole, {
        foreignKey: 'parent_id',
        as: 'children'
      })

      OrgDeptRole.hasMany(models.UserRoleAssignment, {
        foreignKey: 'organization_department_roles_id',
        as: 'user_assignments'
      })
    }
  }

  OrgDeptRole.init(
    {
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      organization_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      department_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      camunda_group_key: {
        type: DataTypes.STRING,
        allowNull: false
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'OrgDeptRole',
      tableName: 'organization_department_roles',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return OrgDeptRole
}
