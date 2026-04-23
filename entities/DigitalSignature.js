'use strict';

module.exports = (sequelize, DataTypes) => {

  class DigitalSignature extends sequelize.Sequelize.Model {
    static associate(models) {

      DigitalSignature.belongsTo(models.DocumentSignature, {
        foreignKey: 'document_id',
        as: 'document',
        onDelete: 'CASCADE',
      });

      DigitalSignature.belongsTo(models.UserKey, {
        foreignKey: 'user_key_id',
        as: 'user_key',
        onDelete: 'CASCADE',
      });

    }
  }

  DigitalSignature.init(
    {
      document_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      user_key_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      signature_order: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      previous_signature_hash: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      signed_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      signature_value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      signed_at: {
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
      modelName: 'DigitalSignature',
      tableName: 'digital_signature',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return DigitalSignature;
};