'use strict';

module.exports = (sequelize, DataTypes) => {

  class SignatureVerification extends sequelize.Sequelize.Model {
    static associate(models) {

      SignatureVerification.belongsTo(models.DocumentInstance, {
        foreignKey: 'document_id',
        as: 'document',
        onDelete: 'CASCADE',
      });

    }
  }

  SignatureVerification.init(
    {
      document_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      is_valid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      details: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      checked_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
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
      modelName: 'SignatureVerification',
      tableName: 'signature_verification',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return SignatureVerification;
};