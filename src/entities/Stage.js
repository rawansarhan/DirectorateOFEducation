'use strict'

module.exports = (sequelize, DataTypes) => {
  class Stage extends sequelize.Sequelize.Model {
    static associate (models) {
      // 🔗 Process Definition
      Stage.belongsTo(models.ProcessDefinition, {
        foreignKey: 'process_definition_id',
        as: 'process_definition',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    }
  }

  Stage.init(
    {
      process_definition_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      code: {
        type: DataTypes.STRING,
        allowNull: false
      },

      type: {
        type: DataTypes.ENUM('USER_TASK', 'SERVICE_TASK'),
        allowNull: false
      },

      camunda_task_key: {
        type: DataTypes.STRING,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'Stage',
      tableName: 'stages',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return Stage
}
