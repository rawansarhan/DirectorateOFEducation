'use strict'

/**
 * سجلات التوقيع الرقمي الاصطناعي (transaction://…) ليست ملفات مرفوعة —
 * type_doc_id يجب أن يكون NULL لها. الملفات الحقيقية من file_picker تبقى لها type_doc_id.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('document_signature', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })

    await queryInterface.sequelize.query(`
      UPDATE document_signature
      SET type_doc_id = NULL
      WHERE file_path LIKE 'transaction://%'
    `)
  },

  down: async (queryInterface, Sequelize) => {
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
      UPDATE document_signature ds
      SET type_doc_id = (
        SELECT id FROM type_docs ORDER BY id ASC LIMIT 1
      )
      WHERE ds.type_doc_id IS NULL
    `)

    await queryInterface.changeColumn('document_signature', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })
  }
}
