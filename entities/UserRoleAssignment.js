'use strict';

module.exports = (sequelize, DataTypes) => {

  class UserRoleAssignment extends sequelize.Sequelize.Model {
    static associate(models) {

      UserRoleAssignment.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
      });

      UserRoleAssignment.belongsTo(models.OrgDeptRole, {
        foreignKey: 'organization_department_role_id',
        as: 'org_department_role',
        onDelete: 'CASCADE',
      });

    }
  }

  UserRoleAssignment.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      organization_department_role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      start_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      end_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'UserRoleAssignment',
      tableName: 'user_role_assignments',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return UserRoleAssignment;
};