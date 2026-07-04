'use strict'

/** مسودات رفع ملفات المعاملات — dedup بالـ hash + picker_key بدل transactionId */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pending_file_uploads', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },

      picker_key: {
        type: Sequelize.STRING(128),
        allowNull: false,
        comment: 'file_picker.data.id — معرّف الودجت'
      },

      type_doc_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'type_docs', key: 'id' },
        onDelete: 'RESTRICT'
      },

      content_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: 'SHA-256 hex للملف'
      },

      file_path: {
        type: Sequelize.STRING(512),
        allowNull: false
      },

      original_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      mime_type: {
        type: Sequelize.STRING(128),
        allowNull: true
      },

      file_size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      status: {
        type: Sequelize.ENUM('pending', 'attached'),
        allowNull: false,
        defaultValue: 'pending'
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },

      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    })

    await queryInterface.addIndex('pending_file_uploads', ['file_path'], {
      name: 'idx_pending_file_uploads_file_path'
    })

    await queryInterface.addIndex('pending_file_uploads', ['user_id', 'created_at'], {
      name: 'idx_pending_file_uploads_user_created'
    })

    await queryInterface.addIndex(
      'pending_file_uploads',
      ['user_id', 'picker_key', 'type_doc_id'],
      {
        unique: true,
        name: 'uq_pending_file_uploads_user_picker_type'
      }
    )

    await queryInterface.addIndex(
      'pending_file_uploads',
      ['user_id', 'type_doc_id', 'content_hash'],
      {
        name: 'idx_pending_file_uploads_user_type_hash'
      }
    )
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pending_file_uploads')
  }
}
