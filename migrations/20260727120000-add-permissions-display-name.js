'use strict'

/**
 * توافق قواعد قديمة كانت لديها:
 *   name = الكود التقني، و display_name اختياري
 *
 * نحو المخطط الجديد:
 *   name = عربي، code = تقني، type = فئة
 *
 * على قواعد جديدة (بعد create-permissions المحدّث) يكون الجدول جاهزاً
 * ولا يوجد display_name — نتخطى بأمان.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('permissions')

    if (table.display_name && !table.code) {
      // مخطط قديم: name تقني + display_name
      await queryInterface.addColumn('permissions', 'code', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      })

      await queryInterface.addColumn('permissions', 'type', {
        type: Sequelize.STRING,
        allowNull: true
      })

      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET code = name
        WHERE code IS NULL
      `)

      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET name = COALESCE(NULLIF(display_name, ''), name)
        WHERE display_name IS NOT NULL AND display_name <> ''
      `)

      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET type = COALESCE(type, 'employee')
        WHERE type IS NULL
      `)

      await queryInterface.changeColumn('permissions', 'code', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      })

      await queryInterface.changeColumn('permissions', 'type', {
        type: Sequelize.STRING,
        allowNull: false
      })

      await queryInterface.removeColumn('permissions', 'display_name')
      return
    }

    if (table.display_name && table.code) {
      await queryInterface.removeColumn('permissions', 'display_name')
    }

    // مخطط جديد مسبقاً — لا شيء
  },

  async down (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('permissions')

    if (!table.display_name && table.code) {
      await queryInterface.addColumn('permissions', 'display_name', {
        type: Sequelize.STRING,
        allowNull: true
      })

      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET display_name = name
      `)

      // لا نعيد name إلى الكود تلقائياً لتفادي فقدان الترجمة العربية
    }
  }
}
