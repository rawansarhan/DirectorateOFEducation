'use strict'

/**
 * يضيف عمود display_name إلى جدول permissions.
 *
 * name         = الكود التقني ('ROLE_PERMISSION_CREATE') ويُستخدم في فحص
 *                الصلاحيات داخل authorize() — لا يُمس إطلاقاً.
 * display_name = الاسم العربي المعروض في الواجهة.
 *
 * العمود nullable عمداً: الصلاحيات التي لم تُترجم بعد تعرض name كبديل،
 * فإضافة صلاحية جديدة دون ترجمة لا تكسر شيئاً.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('permissions', 'display_name', {
      type: Sequelize.STRING,
      allowNull: true
    })
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('permissions', 'display_name')
  }
}
