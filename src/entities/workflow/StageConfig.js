'use strict'

module.exports = (sequelize, DataTypes) => {
  class StageConfig extends sequelize.Sequelize.Model {
    static associate (models) {
      StageConfig.belongsTo(models.Stage, {
        foreignKey: 'stage_id',
        as: 'stage',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      })
    }
  }

  StageConfig.init(
    {
      stage_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      config_json: {
        type: DataTypes.JSON,
        allowNull: false
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
      modelName: 'StageConfig',
      tableName: 'stage_configs',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return StageConfig
}
