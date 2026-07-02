'use strict'

/**
 * فهارس لتحسين أداء قوائم مهام الموظف:
 *   GET /api/workflow/tasks
 *   GET /api/workflow/tasks/in-progress
 *   GET /api/workflow/tasks/pending-pickup
 *   GET /api/workflow/tasks?status=completed|rejected
 *
 * المصدر: employeeTaskRepository + getAllTasksService
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    // -------------------------------------------------------------------------
    // process_instances
    // -------------------------------------------------------------------------

    /**
     * يخدم: getRunningInstancesForProcessDefinitions / getTerminalInstancesForStages
     * الاستعلام: WHERE status = 'running'|'completed'
     *            AND process_definition_id IN (...)
     *            ORDER BY created_at ASC (للنشطة، مع LIMIT 120)
     * ترتيب الأعمدة: status أولاً (تصفية عالية التمييز) ثم process_definition_id ثم created_at للفرز.
     */
    await queryInterface.addIndex(
      'process_instances',
      ['status', 'process_definition_id', 'created_at'],
      { name: 'idx_pi_status_proc_created' }
    )

    /**
     * يخدم: JOIN process_instances → transactions في قائمة المهام النشطة
     * الاستعلام: include transaction WHERE transactions.status = 'in_progress'
     * بدون فهرس على transaction_id يعمل sequential scan على process_instances عند الربط.
     */
    await queryInterface.addIndex(
      'process_instances',
      ['transaction_id'],
      { name: 'idx_pi_transaction_id' }
    )

    // -------------------------------------------------------------------------
    // process_instance_stage
    // -------------------------------------------------------------------------

    /**
     * يخدم: countCompletedStagesByTransactionIds، getCompletedStageCodesByTransactionIds
     * الاستعلام: WHERE transaction_id IN (...) AND status = 'completed'
     * يُستدعى لكل دفعة معاملات عند حساب نسبة الإنجاز وفلترة المراحل المكتملة.
     */
    await queryInterface.addIndex(
      'process_instance_stage',
      ['transaction_id', 'status'],
      { name: 'idx_pis_transaction_status' }
    )

    /**
     * يخدم: getLatestStageNamesByTransactionIds
     * الاستعلام: WHERE transaction_id IN (...)
     *            ORDER BY transaction_id ASC, updated_at DESC
     * يُسرّع اختيار أحدث مرحلة لكل معاملة.
     */
    await queryInterface.addIndex(
      'process_instance_stage',
      ['transaction_id', 'updated_at'],
      { name: 'idx_pis_transaction_updated' }
    )

    /**
     * يخدم: getTransactionIdsPassedDepartments (قوائم منجزة/مرفوضة حسب الدائرة)
     * الاستعلام: WHERE stage_code IN (...) AND status IN ('completed','rejected','in_progress')
     *            GROUP BY transaction_id
     */
    await queryInterface.addIndex(
      'process_instance_stage',
      ['stage_code', 'status'],
      { name: 'idx_pis_stage_code_status' }
    )

    // -------------------------------------------------------------------------
    // stages
    // -------------------------------------------------------------------------

    /**
     * يخدم: stageRepository.findByCodeAndProcess داخل matchInstancesToUserStages
     * الاستعلام: WHERE process_definition_id = ? AND code = ?
     * كان يُنفَّذ N مرة (مرة لكل process instance) — هذا الفهرس يحوّله lookup سريع.
     * UNIQUE يمنع تكرار كود المرحلة ضمن نفس العملية.
     */
    await queryInterface.addIndex(
      'stages',
      ['process_definition_id', 'code'],
      {
        name: 'idx_stages_proc_code',
        unique: true
      }
    )

    // -------------------------------------------------------------------------
    // transactions
    // -------------------------------------------------------------------------

    /**
     * يخدم: فلتر حالة المعاملة في JOIN (in_progress للنشطة، completed/rejected للمنتهية)
     *         + ORDER BY transactions.created_at في القوائم المنتهية
     * الاستعلام: WHERE status = ? [ORDER BY created_at]
     */
    await queryInterface.addIndex(
      'transactions',
      ['status', 'created_at'],
      { name: 'idx_transactions_status_created' }
    )

    // -------------------------------------------------------------------------
    // user_role_assignments
    // -------------------------------------------------------------------------

    /**
     * يخدم: getUserRoleIds — أول خطوة في كل طلب قائمة مهام
     * الاستعلام: WHERE user_id = ? AND is_active = true
     * يوجد UNIQUE(user_id, organization_department_roles_id) لكنه لا يغطي فلتر is_active بكفاءة.
     */
    await queryInterface.addIndex(
      'user_role_assignments',
      ['user_id', 'is_active'],
      { name: 'idx_ura_user_active' }
    )

    /**
     * يخدم: getAccessibleStageContext، getUserIdsForStageIds (إبطال كاش المستخدمين المعنيين)
     * الاستعلام: WHERE organization_department_roles_id IN (...) AND is_active = true
     */
    await queryInterface.addIndex(
      'user_role_assignments',
      ['organization_department_roles_id', 'is_active'],
      { name: 'idx_ura_odr_active' }
    )

    // -------------------------------------------------------------------------
    // organization_department_roles
    // -------------------------------------------------------------------------

    /**
     * يخدم: getStageIdsByDepartmentIds / فلاتر الدوائر في إحصائيات وقوائم الأقسام
     * الاستعلام: JOIN organization_department_roles WHERE department_id IN (...) AND is_active = true
     */
    await queryInterface.addIndex(
      'organization_department_roles',
      ['department_id', 'is_active'],
      { name: 'idx_odr_department_active' }
    )
  },

  async down (queryInterface) {
    await queryInterface.removeIndex(
      'organization_department_roles',
      'idx_odr_department_active'
    )
    await queryInterface.removeIndex(
      'user_role_assignments',
      'idx_ura_odr_active'
    )
    await queryInterface.removeIndex(
      'user_role_assignments',
      'idx_ura_user_active'
    )
    await queryInterface.removeIndex(
      'transactions',
      'idx_transactions_status_created'
    )
    await queryInterface.removeIndex('stages', 'idx_stages_proc_code')
    await queryInterface.removeIndex(
      'process_instance_stage',
      'idx_pis_stage_code_status'
    )
    await queryInterface.removeIndex(
      'process_instance_stage',
      'idx_pis_transaction_updated'
    )
    await queryInterface.removeIndex(
      'process_instance_stage',
      'idx_pis_transaction_status'
    )
    await queryInterface.removeIndex(
      'process_instances',
      'idx_pi_transaction_id'
    )
    await queryInterface.removeIndex(
      'process_instances',
      'idx_pi_status_proc_created'
    )
  }
}
