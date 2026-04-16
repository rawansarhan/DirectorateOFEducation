'use strict';

module.exports = (sequelize, DataTypes) => {

  class StageRule extends sequelize.Sequelize.Model {
    static associate(models) {

      StageRule.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  StageRule.init(
    {
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      condition_expression: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      next_stage_code: {
        type: DataTypes.STRING,
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
      modelName: 'StageRule',
      tableName: 'stage_rules',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageRule;
};