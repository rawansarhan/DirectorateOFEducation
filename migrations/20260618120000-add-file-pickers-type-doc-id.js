'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('file_pickers', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })

    await queryInterface.sequelize.query(`
      UPDATE file_pickers
      SET type_doc_id = (
        SELECT id FROM type_docs WHERE is_active = true ORDER BY id ASC LIMIT 1
      )
      WHERE type_doc_id IS NULL
    `)

    await queryInterface.changeColumn('file_pickers', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })

    await queryInterface.addIndex(
      'file_pickers',
      ['type_doc_id'],
      { name: 'idx_file_pickers_type_doc_id' }
    )
  },

  async down (queryInterface) {
    await queryInterface.removeIndex(
      'file_pickers',
      'idx_file_pickers_type_doc_id'
    )
    await queryInterface.removeColumn('file_pickers', 'type_doc_id')
  }
}
