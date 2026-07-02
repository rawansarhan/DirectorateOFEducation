'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('document_templates', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })

    await queryInterface.sequelize.query(`
      UPDATE document_templates
      SET type_doc_id = (
        SELECT id FROM type_docs WHERE name = 'وثائق المواطن' LIMIT 1
      )
      WHERE type_doc_id IS NULL
    `)

    await queryInterface.changeColumn('document_templates', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })

    await queryInterface.removeColumn('document_templates', 'file_type')

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_document_templates_file_type"'
    )

    await queryInterface.addIndex(
      'document_templates',
      ['type_doc_id'],
      { name: 'idx_document_templates_type_doc_id' }
    )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'document_templates',
      'idx_document_templates_type_doc_id'
    )

    await queryInterface.addColumn('document_templates', 'file_type', {
      type: Sequelize.ENUM('pdf', 'docx', 'html'),
      allowNull: true
    })

    await queryInterface.sequelize.query(`
      UPDATE document_templates SET file_type = 'pdf' WHERE file_type IS NULL
    `)

    await queryInterface.changeColumn('document_templates', 'file_type', {
      type: Sequelize.ENUM('pdf', 'docx', 'html'),
      allowNull: false
    })

    await queryInterface.removeColumn('document_templates', 'type_doc_id')
  }
}
