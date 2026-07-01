'use strict'

/**
 * فهارس لدعم بناء الوثيقة النهائية المدمجة:
 * الاستعلامات تُرشّح بـ transaction_id وتُرتّب بـ created_at (تصاعدياً).
 * فهرس مركّب (transaction_id, created_at) يخدم الترشيح + الترتيب معاً.
 */

module.exports = {
  async up (queryInterface) {
    await queryInterface.addIndex('document_instance', ['transaction_id', 'created_at'], {
      name: 'idx_document_instance_tx_created_at'
    })

    await queryInterface.addIndex('document_signature', ['transaction_id', 'created_at'], {
      name: 'idx_document_signature_tx_created_at'
    })
  },

  async down (queryInterface) {
    await queryInterface.removeIndex(
      'document_instance',
      'idx_document_instance_tx_created_at'
    )

    await queryInterface.removeIndex(
      'document_signature',
      'idx_document_signature_tx_created_at'
    )
  }
}
