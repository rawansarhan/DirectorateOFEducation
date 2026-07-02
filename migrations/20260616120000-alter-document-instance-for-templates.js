'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('document_instance', 'generated_pdf_path', {
      type: Sequelize.STRING,
      allowNull: true
    })

    await queryInterface.addColumn('document_instance', 'document_template_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'document_templates', key: 'id' },
      onDelete: 'RESTRICT'
    })

    await queryInterface.addIndex(
      'document_instance',
      ['transaction_id', 'document_template_id'],
      { name: 'idx_document_instance_transaction_template' }
    )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'document_instance',
      'idx_document_instance_transaction_template'
    )

    await queryInterface.removeColumn('document_instance', 'document_template_id')

    await queryInterface.sequelize.query(`
      UPDATE document_instance
      SET generated_pdf_path = '/legacy/pending.pdf'
      WHERE generated_pdf_path IS NULL
    `)

    await queryInterface.changeColumn('document_instance', 'generated_pdf_path', {
      type: Sequelize.STRING,
      allowNull: false
    })
  }
}
