'use strict';

module.exports = (sequelize, DataTypes) => {

  class Department extends sequelize.Sequelize.Model {
    static associate(models) {

      // organization relation
      Department.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // self relation (parent / children departments)
      Department.belongsTo(models.Department, {
        foreignKey: 'parent_id',
        as: 'parent',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      Department.hasMany(models.Department, {
        foreignKey: 'parent_id',
        as: 'children',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      Department.hasMany(models.OrgDeptRole, {
        foreignKey: 'department_id',
        as: 'department',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
  }

  Department.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      organization_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      parent_id: {
        type: DataTypes.INTEGER,
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
      modelName: 'Department',
      tableName: 'departments',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Department;
};