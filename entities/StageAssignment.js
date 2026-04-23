'use strict';

module.exports = (sequelize, DataTypes) => {

  class StageAssignment extends sequelize.Sequelize.Model {
    static associate(models) {

      StageAssignment.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      StageAssignment.belongsTo(models.OrgDeptRole, {
        foreignKey: 'organization_department_role_id',
        as: 'organization_department_role',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  StageAssignment.init(
    {
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      organization_department_role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      modelName: 'StageAssignment',
      tableName: 'stage_assignments',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageAssignment;
};