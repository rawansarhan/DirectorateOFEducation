'use strict'

/**
 * فهارس تدعم استعلام التحقق من الصلاحية:
 * permissions → role_permissions → organization_department_roles ← user_role_assignments
 *
 * - permissions.name: فهرس من UNIQUE الموجود مسبقاً
 * - role_permissions: المفتاح (role_id, permission_id) يغطي البحث من جهة الدور،
 *   لكن البحث من جهة الصلاحية يحتاج permission_id
 * - organization_department_roles: المفتاح على id موجود؛ الربط من role_permissions يحتاج role_id
 * - user_role_assignments: القيد الفريد (user_id, organization_department_role_id) يغطي user_id؛
 *   الفهرس الجزئي يقلّل الصفوف عند غالبية التعيينات النشطة
 */
module.exports = {
  up: async (queryInterface) => {
    // IF NOT EXISTS: يمنع فشل إعادة التشغيل بعد تنفيذ جزئي أو وجود الفهرس مسبقاً
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
      ON role_permissions (permission_id);
    `)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_organization_department_roles_role_id
      ON organization_department_roles (role_id);
    `)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_active
      ON user_role_assignments (user_id)
      WHERE is_active = true;
    `)
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_user_role_assignments_user_active;
    `)
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_organization_department_roles_role_id;
    `)
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_role_permissions_permission_id;
    `)
  }
}
