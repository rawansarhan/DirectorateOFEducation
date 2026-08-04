'use strict'

/**
 * permissions:
 *   name  = الاسم العربي المعروض (مثال: اجراءات استلام المعاملة وتوقيعها)
 *   code  = الكود التقني المستخدم في authorize() (مثال: TASK_SIGNING)
 *   type  = فئة الصلاحية: admin | employee | citizen | employee,citizen,admin
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'الاسم العربي المعروض في الواجهة'
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'الكود التقني لفحص الصلاحيات'
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'admin | employee | citizen | employee,citizen,admin'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    })
  },

  async down (queryInterface) {
    await queryInterface.dropTable('permissions')
  }
}
