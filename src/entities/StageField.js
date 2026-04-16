'use strict';

module.exports = (sequelize, DataTypes) => {

  class StageField extends sequelize.Sequelize.Model {
    static associate(models) {

      StageField.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  StageField.init(
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
      modelName: 'StageField',
      tableName: 'stage_fields',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageField;
};