'use strict';

module.exports = (sequelize, DataTypes) => {

  class Organization extends sequelize.Sequelize.Model {
    static associate(models) {

      // self relation (parent / child orgs)
      Organization.belongsTo(models.Organization, {
        foreignKey: 'parent_id',
        as: 'parent',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      Organization.hasMany(models.Organization, {
        foreignKey: 'parent_id',
        as: 'children',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // address relation
      Organization.belongsTo(models.Location, {
        foreignKey: 'location_id',
        as: 'location',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

    }
  }

  Organization.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      Location_id: {
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
      modelName: 'Organization',
      tableName: 'organizations',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Organization;
};