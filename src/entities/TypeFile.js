'use strict';

module.exports = (sequelize, DataTypes) => {

  class TypeFile extends sequelize.Sequelize.Model {
    static associate(models) {

      TypeFile.hasMany(models.File, {
        foreignKey: 'type_file_id',
        as: 'files',
      });

    }
  }

  TypeFile.init(
    {
      name: {
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
      modelName: 'TypeFile',
      tableName: 'type_file',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return TypeFile;
};