'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  class OtpCode extends Model {
    static associate(models) {}
  }

  OtpCode.init(
    {
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      session_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      otp: {
        type: DataTypes.STRING(6),
        allowNull: false
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false
      },
    },
    {
      sequelize,
      modelName: 'OtpCode',
      tableName: 'otp_codes',
      timestamps: true,
      underscored: true,
    }
  );

  return OtpCode;
};
