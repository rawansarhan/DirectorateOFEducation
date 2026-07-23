'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate (models) {
      Application.hasMany(models.AppVersion, {
        foreignKey: 'application_id',
        as: 'versions'
      })
    }

    /** direct = تحميل وتثبيت داخل التطبيق · store = فتح رابط المتجر خارجياً. */
    usesDirectDownload () {
      return this.update_strategy === 'direct'
    }

    /** رابط المتجر المناسب للمنصة، أو null إن لم يُضبط. */
    getStoreUrlForPlatform (platform) {
      if (platform === 'ios') return this.apple_store_url || null
      if (platform === 'android') return this.google_play_url || null
      return null
    }
  }

  Application.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      display_name: {
        type: DataTypes.STRING(150),
        allowNull: false
      },
      package_name: {
        type: DataTypes.STRING(150),
        allowNull: true
      },
      apple_store_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      google_play_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      update_strategy: {
        type: DataTypes.ENUM('store', 'direct'),
        allowNull: false,
        defaultValue: 'store'
      }
    },
    {
      sequelize,
      modelName: 'Application',
      tableName: 'applications',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return Application
}
