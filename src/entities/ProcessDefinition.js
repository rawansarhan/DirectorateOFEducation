'use strict';

module.exports = (sequelize, DataTypes) => {

  class ProcessDefinition extends sequelize.Sequelize.Model {
    static associate(models) {

      // organization relation
      ProcessDefinition.belongsTo(models.Organization, {
        foreignKey: 'organization_id',
        as: 'organization',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // type_trans relation
      ProcessDefinition.belongsTo(models.TypeTrans, {
        foreignKey: 'type_trans_id',
        as: 'type_trans',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      // 🔥 stages relation (مهم)
      ProcessDefinition.hasMany(models.Stage, {
        foreignKey: 'process_definition_id',
        as: 'stages',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

    }
  }

  ProcessDefinition.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      code: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      camunda_process_key: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      camunda_deployment_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      status: {
        type: DataTypes.ENUM('draft', 'deployed'),
        defaultValue: 'draft',
      },

      is_latest: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      bpmn_file_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      bpmn_xml: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      organization_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      type_trans_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
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
      modelName: 'ProcessDefinition',
      tableName: 'process_definitions',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return ProcessDefinition;
};