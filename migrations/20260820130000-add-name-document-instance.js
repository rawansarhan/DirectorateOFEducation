'use strict'

/**
 * اسم العرض لـ document_instance = document_templates.name وقت GENERATE_PDF.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('document_instance', 'name', {
      type: Sequelize.STRING(256),
      allowNull: true,
      comment: 'اسم العرض من document_templates.name — يُحفظ وقت GENERATE_PDF'
    })

    await queryInterface.sequelize.query(`
      UPDATE document_instance AS di
      SET name = dt.name
      FROM document_templates AS dt
      WHERE di.document_template_id = dt.id
        AND di.name IS NULL
    `)
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('document_instance', 'name')
  }
}
