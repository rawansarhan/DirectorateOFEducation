'use strict';

module.exports = (sequelize, DataTypes) => {

  class StageCalculation extends sequelize.Sequelize.Model {
    static associate(models) {

      // stage relation
      StageCalculation.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // calculation relation
      StageCalculation.belongsTo(models.Calculation, {
        foreignKey: 'calculation_id',
        as: 'calculation',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  StageCalculation.init(
    {
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      calculation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
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
      modelName: 'StageCalculation',
      tableName: 'stage_calculations',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageCalculation;
};