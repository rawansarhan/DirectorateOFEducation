'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RolePermission extends Model {
    static associate(models) {
      RolePermission.belongsTo(models.OrgDeptRole, {
        foreignKey: 'organization_department_roles_id',
        as: 'orgDeptRole',
        onDelete: 'CASCADE'
      });
      RolePermission.belongsTo(models.Permission, {
        foreignKey: 'permission_id',
        onDelete: 'CASCADE',
        as: 'permissions'
      });
    }
  }

  RolePermission.init({
    organization_department_roles_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'organization_department_roles',
        key: 'id'
      }
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'RolePermission',
    tableName: 'role_permissions',
    timestamps: false,
   primaryKey: ['organization_department_roles_id', 'permission_id']
  });

  return RolePermission;
};
