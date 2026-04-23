'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RolePermission extends Model {
    static associate(models) {
      RolePermission.belongsTo(models.Role, {
        foreignKey: 'role_id',
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
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
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
    primaryKey: ['role_id', 'permission_id']
  });

  return RolePermission;
};
