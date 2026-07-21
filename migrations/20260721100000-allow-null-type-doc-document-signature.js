'use strict'

/**
 * سجلات التوقيع الرقمي الاصطناعي (transaction://…) ليست ملفات مرفوعة —
 * type_doc_id يجب أن يكون NULL لها.
 *
 * ملاحظة PostgreSQL: لا نستخدم changeColumn مع references هنا
 * لأنه يحاول إعادة إنشاء الـ FK ويفشل غالباً.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE document_signature
      ALTER COLUMN type_doc_id DROP NOT NULL
    `)

    await queryInterface.sequelize.query(`
      UPDATE document_signature
      SET type_doc_id = NULL
      WHERE file_path LIKE 'transaction://%'
    `)
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE document_signature
      SET type_doc_id = (
        SELECT id FROM type_docs
        WHERE name = 'وثيقة موقّعة رقمياً'
        LIMIT 1
      )
      WHERE type_doc_id IS NULL
        AND file_path LIKE 'transaction://%'
    `)

    await queryInterface.sequelize.query(`
      UPDATE document_signature
      SET type_doc_id = (
        SELECT id FROM type_docs ORDER BY id ASC LIMIT 1
      )
      WHERE type_doc_id IS NULL
    `)

    await queryInterface.sequelize.query(`
      ALTER TABLE document_signature
      ALTER COLUMN type_doc_id SET NOT NULL
    `)
  }
}
