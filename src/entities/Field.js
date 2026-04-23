'use strict';

module.exports = (sequelize, DataTypes) => {

  class Field extends sequelize.Sequelize.Model {
    static associate(models) {
      // ممكن تربطها لاحقاً بـ stage_fields (many-to-many)
      // Field.belongsToMany(models.Stage, {
      //   through: models.StageField,
      //   foreignKey: 'field_id',
      //   otherKey: 'stage_id',
      //   as: 'stages',
      // });
    }
  }

  Field.init(
    {
      field_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      field_type: {
        type: DataTypes.ENUM('string', 'int', 'text', 'date', 'boolean', 'float'),
        allowNull: false,
      },
      list_json: {
        type: DataTypes.JSON,
        allowNull: true
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
      modelName: 'Field',
      tableName: 'fields',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Field;
};