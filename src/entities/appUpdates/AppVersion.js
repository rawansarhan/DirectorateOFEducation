'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AppVersion extends Model {
    static associate (models) {
      AppVersion.belongsTo(models.Application, {
        foreignKey: 'application_id',
        as: 'application'
      })
    }

    /** force_update_below_version_code = null → لا إجبار لأحد أبداً. */
    isForceUpdateFor (currentVersionCode) {
      if (this.force_update_below_version_code === null) return false
      return currentVersionCode < this.force_update_below_version_code
    }

    /** soft_update_below_version_code = null → اعرضه للجميع. */
    isSoftUpdateFor (currentVersionCode) {
      if (this.soft_update_below_version_code === null) return true
      return currentVersionCode < this.soft_update_below_version_code
    }
  }

  AppVersion.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      platform: {
        type: DataTypes.ENUM('android', 'ios', 'windows'),
        allowNull: false
      },
      version_name: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      version_code: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      apk_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      apk_size: {
        type: DataTypes.BIGINT,
        allowNull: true
      },
      changelog: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },
      force_update_below_version_code: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      soft_update_below_version_code: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'AppVersion',
      tableName: 'app_versions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return AppVersion
}
