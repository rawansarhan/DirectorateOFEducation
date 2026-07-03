'use strict'

/**
 * فهارس لـ GET /api/department/employees
 * - تعيينات الموظفين حسب الدائرة
 * - عدّ المراحل المكتملة لكل موظف
 * - المهام النشطة على مراحل الدائرة
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.addIndex(
      'process_instance_stage',
      ['assigned_to', 'status'],
      { name: 'idx_pis_assigned_status' }
    )

    await queryInterface.addIndex(
      'process_instances',
      ['status', 'current_stage_id'],
      { name: 'idx_pi_status_current_stage' }
    )

    await queryInterface.addIndex(
      'stage_assignments',
      ['stage_id', 'organization_department_roles_id'],
      { name: 'idx_sa_stage_odr' }
    )
  },

  async down (queryInterface) {
    await queryInterface.removeIndex(
      'stage_assignments',
      'idx_sa_stage_odr'
    )
    await queryInterface.removeIndex(
      'process_instances',
      'idx_pi_status_current_stage'
    )
    await queryInterface.removeIndex(
      'process_instance_stage',
      'idx_pis_assigned_status'
    )
  }
}
