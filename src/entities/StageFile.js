'use strict';

module.exports = (sequelize, DataTypes) => {

  class StageFile extends sequelize.Sequelize.Model {
    static associate(models) {

      StageFile.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      StageFile.hasMany(models.StageRequiredFile, {
        foreignKey: 'stage_files_id',
        as: 'required_files',
      });

    }
  }

  StageFile.init(
    {
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      modelName: 'StageFile',
      tableName: 'stage_files',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageFile;
};