'use strict';

/**
 * document_instance — نسخة قالب مرتبطة بمعاملة
 *
 * يُنشأ فقط عند نجاح GENERATE_PDF:
 *   data_json = values من templates في transaction.data
 *   generated_pdf_path = مسار PDF المولّد
 *
 * document_template_id → document_templates.id
 */

module.exports = (sequelize, DataTypes) => {

  class DocumentInstance extends sequelize.Sequelize.Model {
    static associate(models) {

      DocumentInstance.belongsTo(models.Transaction, {
        foreignKey: 'transaction_id',
        as: 'transaction',
        onDelete: 'CASCADE'
      })

      DocumentInstance.belongsTo(models.DocumentTemplate, {
        foreignKey: 'document_template_id',
        as: 'document_template'
      })

    }
  }

  DocumentInstance.init(
    {
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      document_template_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      generated_pdf_path: {
        type: DataTypes.STRING,
        allowNull: true
      },

      // SHA-256 (hex) لبايتات الـ PDF النهائي بعد حقن رمز QR — للتحقق العام
      content_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
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