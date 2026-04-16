'use strict';

module.exports = (sequelize, DataTypes) => {

  class TypeTrans extends sequelize.Sequelize.Model {
    static associate(models) {
        TypeTrans.hasMany(models.Transaction, {
            foreignKey: 'type_trans_id',
            as: 'type_trans',
          });

          TypeTrans.hasMany(models.ProcessDefinition, {
            foreignKey: 'type_trans_id',
            as: 'process_definitions',
          });
    }
  }

  TypeTrans.init(
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
      modelName: 'TypeTrans',
      tableName: 'type_trans',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return TypeTrans;
};