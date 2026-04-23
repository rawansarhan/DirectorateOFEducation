'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  class OtpCode extends Model {
    static associate(models) {
    }
  }

  OtpCode.init(
    {
      email: {                   
        type: DataTypes.STRING(100),
        allowNull: false,          
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
