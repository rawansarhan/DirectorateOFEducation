'use strict'

/** type_doc_id اختياري — لرفعات extract-fields للقوالب */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('pending_file_uploads', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('pending_file_uploads', 'type_doc_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'type_docs', key: 'id' },
      onDelete: 'RESTRICT'
    })
  }
}
