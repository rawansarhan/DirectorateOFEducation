'use strict';

module.exports = (sequelize, DataTypes) => {

  class File extends sequelize.Sequelize.Model {
    static associate(models) {

      File.belongsTo(models.TypeFile, {
        foreignKey: 'type_file_id',
        as: 'type_file',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      File.hasMany(models.StageRequiredFile, {
        foreignKey: 'file_id',
        as: 'stage_required_files',
      });

    }
  }

  File.init(
    {
      file_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      file_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      type_file_id: {
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
      modelName: 'File',
      tableName: 'files',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return File;
};