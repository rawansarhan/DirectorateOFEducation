'use strict';

module.exports = (sequelize, DataTypes) => {

  class DocumentSignature extends sequelize.Sequelize.Model {
    static associate(models) {

      DocumentSignature.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE',
      });

      DocumentSignature.hasMany(models.DigitalSignature, {
        foreignKey: 'document_id',
        as: 'signatures',
      });

    }
  }

  DocumentSignature.init(
    {
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      file_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      file_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      file_type: {
        type: DataTypes.ENUM('generated','signed','stamped'),
        allowNull: false,
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
      modelName: 'DocumentSignature',
      tableName: 'document_signature',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return DocumentSignature;
};