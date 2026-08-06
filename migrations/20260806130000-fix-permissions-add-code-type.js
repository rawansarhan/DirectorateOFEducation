'use strict'

/**
 * إصلاح قواعد فيها permissions بدون عمود code
 * (المخطط القديم: name = كود تقني، وأحياناً بدون display_name)
 *
 * الهدف:
 *   name  = عربي (أو يبقى كما هو حتى إعادة الـ seeder)
 *   code  = الكود التقني
 *   type  = فئة الصلاحية
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('permissions')

    if (!table.code) {
      await queryInterface.addColumn('permissions', 'code', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      })

      // في المخطط القديم name كان الكود التقني
      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET code = name
        WHERE code IS NULL
      `)

      await queryInterface.changeColumn('permissions', 'code', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      })
    }

    if (!table.type) {
      await queryInterface.addColumn('permissions', 'type', {
        type: Sequelize.STRING,
        allowNull: true
      })

      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET type = 'employee'
        WHERE type IS NULL
      `)

      await queryInterface.changeColumn('permissions', 'type', {
        type: Sequelize.STRING,
        allowNull: false
      })
    } else {
      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET type = COALESCE(NULLIF(TRIM(type), ''), 'employee')
        WHERE type IS NULL OR TRIM(type) = ''
      `)
    }

    // إن وُجد display_name: انقل الاسم العربي إلى name ثم احذف العمود
    const afterAdd = await queryInterface.describeTable('permissions')

    if (afterAdd.display_name) {
      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET name = COALESCE(NULLIF(display_name, ''), name)
        WHERE display_name IS NOT NULL AND display_name <> ''
      `)

      await queryInterface.removeColumn('permissions', 'display_name')
    }
  },

  async down (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('permissions')

    // لا نحذف code/type في down لتفادي كسر التطبيق؛
    // فقط نعيد display_name اختيارياً إن لم يوجد.
    if (!table.display_name && table.code) {
      await queryInterface.addColumn('permissions', 'display_name', {
        type: Sequelize.STRING,
        allowNull: true
      })

      await queryInterface.sequelize.query(`
        UPDATE permissions
        SET display_name = name
      `)
    }
  }
}
