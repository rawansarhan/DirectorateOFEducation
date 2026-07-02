'use strict'

/**
 * يضيف عمود content_hash إلى document_instance.
 *
 * content_hash = SHA-256 (hex) لبايتات ملف PDF النهائي بعد حقن رمز QR.
 * يُستخدم في صفحة التحقق العامة لمطابقة الملف الممسوح مع النسخة المسجّلة
 * في الخادم (كشف أي تعديل لاحق على ملف الـ PDF).
 *
 * ملاحظة: index (transaction_id, document_template_id) موجود مسبقاً عبر
 * migration 20260616120000، لذا لا يُعاد إنشاؤه هنا.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('document_instance', 'content_hash', {
      type: Sequelize.STRING(64),
      allowNull: true
    })
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('document_instance', 'content_hash')
  }
}
