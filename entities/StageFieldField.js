'use strict';

module.exports = (sequelize, DataTypes) => {

  class StageFieldField extends sequelize.Sequelize.Model {
    static associate(models) {

      StageFieldField.belongsTo(models.StageField, {
        foreignKey: 'stage_field_id',
        as: 'stage_field',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      StageFieldField.belongsTo(models.Field, {
        foreignKey: 'field_id',
        as: 'field',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  StageFieldField.init(
    {
      stage_field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
      modelName: 'StageFieldField',
      tableName: 'stagefield_fields',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StageFieldField;
};