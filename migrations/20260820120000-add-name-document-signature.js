'use strict'

/**
 * اسم العرض للملف المرفوع = file_picker.data.label وقت التسجيل.
 * مسار القرص يبقى في file_path كما هو.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('document_signature', 'name', {
      type: Sequelize.STRING(256),
      allowNull: true,
      comment: 'اسم العرض من file_picker.label — يُحفظ وقت التسجيل'
    })
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('document_signature', 'name')
  }
}
