'use strict'

module.exports = (sequelize, DataTypes) => {
  class TypeDoc extends sequelize.Sequelize.Model {
    static associate (models) {
      TypeDoc.hasMany(models.DocumentSignature, {
        foreignKey: 'type_doc_id',
        as: 'documents'
      })

      TypeDoc.hasMany(models.DocumentTemplate, {
        foreignKey: 'type_doc_id',
        as: 'document_templates'
      })
    }
  }

  TypeDoc.init(
    {
      name: {
        type: DataTypes.STRING(256),
        allowNull: false,
        unique: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'TypeDoc',
      tableName: 'type_docs',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return TypeDoc
}
