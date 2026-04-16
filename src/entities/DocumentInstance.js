'use strict';

module.exports = (sequelize, DataTypes) => {

  class DocumentInstance extends sequelize.Sequelize.Model {
    static associate(models) {

      DocumentInstance.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE',
      });

    }
  }

  DocumentInstance.init(
    {
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      generated_pdf_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM('generated','signed','stamped','archived'),
        defaultValue: 'generated',
      },

      data_json: {
        type: DataTypes.JSON,
        allowNull: true,
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
      modelName: 'DocumentInstance',
      tableName: 'document_instance',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return DocumentInstance;
};