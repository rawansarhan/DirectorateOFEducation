'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('document_signature', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })

    await queryInterface.sequelize.query(`
      UPDATE document_signature
      SET type_doc_id = (
        SELECT id FROM type_docs WHERE name = 'وثائق المواطن' LIMIT 1
      )
      WHERE type_doc_id IS NULL
    `)

    await queryInterface.changeColumn('document_signature', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })

    await queryInterface.removeColumn('document_signature', 'file_hash')
    await queryInterface.removeColumn('document_signature', 'file_type')

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_document_signature_file_type"'
    )
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('document_signature', 'file_hash', {
      type: Sequelize.STRING,
      allowNull: true
    })

    await queryInterface.addColumn('document_signature', 'file_type', {
      type: Sequelize.ENUM('generated', 'signed', 'stamped'),
      allowNull: true
    })

    await queryInterface.removeColumn('document_signature', 'type_doc_id')
  }
}
