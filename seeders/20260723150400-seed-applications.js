'use strict'

/**
 * الصفوف الثلاثة الأساسية لنظام التحديث الذاتي. update_strategy يبدأ store (آمن) —
 * يُحوَّل إلى direct يدوياً عبر PUT /api/app-updates/admin/applications/{id} بعد
 * التأكد أن رابط أول إصدار apk_url يعمل فعلاً.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert(
      'applications',
      [
        {
          name: 'citizen',
          display_name: 'تطبيق المواطن',
          package_name: null,
          update_strategy: 'store',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'employee',
          display_name: 'تطبيق الموظف',
          package_name: null,
          update_strategy: 'store',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'technical_team',
          display_name: 'الفريق التقني',
          package_name: 'technical_team.exe',
          update_strategy: 'store',
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      { ignoreDuplicates: true }
    )
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete(
      'applications',
      { name: ['citizen', 'employee', 'technical_team'] },
      {}
    )
  }
}
