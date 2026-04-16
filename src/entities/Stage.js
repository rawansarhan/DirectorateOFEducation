'use strict';

module.exports = (sequelize, DataTypes) => {

  class Stage extends sequelize.Sequelize.Model {
    static associate(models) {

      // process definition relation
      Stage.belongsTo(models.ProcessDefinition, {
        foreignKey: 'process_definition_id',
        as: 'process_definition',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  Stage.init(
    {
      process_definition_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      camunda_task_key: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      requires_signature: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      code: {
        type: DataTypes.STRING,
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
      modelName: 'Stage',
      tableName: 'stages',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Stage;
};