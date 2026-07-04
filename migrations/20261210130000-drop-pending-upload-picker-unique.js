'use strict'

/** يسمح بعدة ملفات لنفس picker_key — الملف القديم لا يُحذف */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeIndex(
      'pending_file_uploads',
      'uq_pending_file_uploads_user_picker_type'
    )

    await queryInterface.addIndex(
      'pending_file_uploads',
      ['user_id', 'picker_key', 'type_doc_id'],
      {
        name: 'idx_pending_file_uploads_user_picker_type'
      }
    )

    await queryInterface.addIndex(
      'pending_file_uploads',
      ['user_id', 'file_path'],
      {
        unique: true,
        name: 'uq_pending_file_uploads_user_path'
      }
    )
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      'pending_file_uploads',
      'uq_pending_file_uploads_user_path'
    )

    await queryInterface.removeIndex(
      'pending_file_uploads',
      'idx_pending_file_uploads_user_picker_type'
    )

    await queryInterface.addIndex(
      'pending_file_uploads',
      ['user_id', 'picker_key', 'type_doc_id'],
      {
        unique: true,
        name: 'uq_pending_file_uploads_user_picker_type'
      }
    )
  }
}
