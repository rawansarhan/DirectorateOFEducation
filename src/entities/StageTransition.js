'use strict'

module.exports = (sequelize, DataTypes) => {

  class StageTransition extends sequelize.Sequelize.Model {

    static associate(models) {

      StageTransition.belongsTo(models.ProcessDefinition, {
        foreignKey: 'process_definition_id',
        as: 'process_definition',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })

      StageTransition.belongsTo(models.Stage, {
        foreignKey: 'from_stage_id',
        as: 'from_stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })

      StageTransition.belongsTo(models.Stage, {
        foreignKey: 'to_stage_id',
        as: 'to_stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    }
  }

  StageTransition.init(
    {
      process_definition_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      from_stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      to_stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      action: {
        type: DataTypes.ENUM('approve', 'reject', 'return', 'custom'),
        allowNull: false
      },

      condition: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },

      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'StageTransition',
      tableName: 'stage_transitions',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return StageTransition
}