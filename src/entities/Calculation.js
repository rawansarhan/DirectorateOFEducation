'use strict';

module.exports = (sequelize, DataTypes) => {

  class Calculation extends sequelize.Sequelize.Model {
    static associate(models) {
        
    }
  }

  Calculation.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      formula: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      result_field: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1
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
      modelName: 'Calculation',
      tableName: 'calculations',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Calculation;
};