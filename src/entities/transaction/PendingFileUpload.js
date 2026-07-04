'use strict'

module.exports = (sequelize, DataTypes) => {
  class PendingFileUpload extends sequelize.Sequelize.Model {
    static associate (models) {
      PendingFileUpload.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE'
      })

      PendingFileUpload.belongsTo(models.TypeDoc, {
        foreignKey: 'type_doc_id',
        as: 'type_doc',
        onDelete: 'RESTRICT'
      })
    }
  }

  PendingFileUpload.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      picker_key: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      type_doc_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      content_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      file_path: {
        type: DataTypes.STRING(512),
        allowNull: false
      },
      original_name: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      mime_type: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      file_size_bytes: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('pending', 'attached'),
        allowNull: false,
        defaultValue: 'pending'
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
      modelName: 'PendingFileUpload',
      tableName: 'pending_file_uploads',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  )

  return PendingFileUpload
}
