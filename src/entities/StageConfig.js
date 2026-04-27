'use strict';

module.exports = (sequelize, DataTypes) => {
  class StageConfig extends sequelize.Sequelize.Model {
    static associate(models) {

      StageConfig.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  StageConfig.init(
    {
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      type: {
        type: DataTypes.ENUM(
          'fields',
          'files',
          'rules',
          'calculations',
          'document',
          'ui',
          'transitions'
        ),
        allowNull: false,
      },

      config_json: {
        type: DataTypes.JSON,
        allowNull: false,
      },

      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
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
      modelName: 'StageConfig',
      tableName: 'stage_configs',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageConfig;
};