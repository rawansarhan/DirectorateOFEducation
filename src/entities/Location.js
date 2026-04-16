'use strict';

module.exports = (sequelize, DataTypes) => {

  class Location extends sequelize.Sequelize.Model {
    static associate(models) {

      Location.belongsTo(models.Location, {
        foreignKey: 'parent_id',
        as: 'parent',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      Location.belongsTo(models.TypeLocation, {
        foreignKey: 'typeLocation_id',
        as: 'type_location',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      Location.hasMany(models.Location, {
        foreignKey: 'parent_id',
        as: 'children',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

    }
  }

  Location.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      typeLocation_id:{
       type: DataTypes.INTEGER,
       allowNull: false
      },
      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      modelName: 'Location',
      tableName: 'locations',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Location;
};