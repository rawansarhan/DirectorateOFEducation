'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class RefreshToken extends Model {
    static associate (models) {
      RefreshToken.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })

      // سلسلة التدوير: التوكن الذي حلّ محل هذا التوكن عند التجديد
      RefreshToken.belongsTo(models.RefreshToken, {
        foreignKey: 'replaced_by_id',
        as: 'replaced_by'
      })
    }
  }

  RefreshToken.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      // نخزّن hash التوكن فقط (sha256) ولا نخزّن التوكن الخام إطلاقاً
      token_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
      // وقت الإبطال (logout أو تدوير أو كشف إعادة استخدام)
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      // معرّف التوكن الجديد الذي حلّ محل هذا عند التدوير
      replaced_by_id: {
        type: DataTypes.UUID,
        allowNull: true
      },
      // بيانات الجلسة (اختياري) لتمييز الأجهزة
      user_agent: {
        type: DataTypes.STRING,
        allowNull: true
      },
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'RefreshToken',
      tableName: 'refresh_tokens',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return RefreshToken
}
