'use strict';

module.exports = (sequelize, DataTypes) => {

  class StageType extends sequelize.Sequelize.Model {
    static associate(models) {
      // ممكن تربطها لاحقاً بـ Stage أو configs
    }
  }

  StageType.init(
    {
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
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
      modelName: 'StageType',
      tableName: 'stage_type',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageType;
};