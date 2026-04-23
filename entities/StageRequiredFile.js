'use strict';

module.exports = (sequelize, DataTypes) => {

  class StageRequiredFile extends sequelize.Sequelize.Model {
    static associate(models) {

      StageRequiredFile.belongsTo(models.StageFile, {
        foreignKey: 'stage_files_id',
        as: 'stage_file',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      StageRequiredFile.belongsTo(models.File, {
        foreignKey: 'file_id',
        as: 'file',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  StageRequiredFile.init(
    {
      stage_files_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      file_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      required: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
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
      modelName: 'StageRequiredFile',
      tableName: 'stage_required_files',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageRequiredFile;
};