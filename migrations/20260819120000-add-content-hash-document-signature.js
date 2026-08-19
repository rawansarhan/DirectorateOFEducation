'use strict'

/**
 * يضيف content_hash إلى document_signature لتمكين التحقق من سلامة الملف
 * عند توليد الوثيقة النهائية.
 *
 * القيمة تُنسخ من pending_file_uploads.content_hash وقت complete.
 * الصفوف القديمة تبقى NULL → يُتجاوز التحقق (backward-compatible).
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('document_signature', 'content_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'SHA-256 للملف المرفوع — يُنسخ من pending_file_uploads.content_hash عند التسجيل'
    })
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('document_signature', 'content_hash')
  }
}
