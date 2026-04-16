'use strict';

module.exports = (sequelize, DataTypes) => {

  class TypeLocation extends sequelize.Sequelize.Model {
    static associate(models) {

        TypeLocation.hasMany(models.Location, {
        foreignKey: 'typeLocation_id',
        as: 'type_location',
      });

    }
  }

  TypeLocation.init(
    {

      name: {
        type: DataTypes.STRING,
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