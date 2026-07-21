'use strict'

/** type_doc_id اختياري — لرفعات extract-fields للقوالب */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE pending_file_uploads
      ALTER COLUMN type_doc_id DROP NOT NULL
    `)
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE pending_file_uploads
      SET type_doc_id = (
        SELECT id FROM type_docs ORDER BY id ASC LIMIT 1
      )
      WHERE type_doc_id IS NULL
    `)

    await queryInterface.sequelize.query(`
      ALTER TABLE pending_file_uploads
      ALTER COLUMN type_doc_id SET NOT NULL
    `)
  }
}
