'use strict'

/**
 * فهارس لقوائم إدارة العمليات:
 *   GET /api/process_definitions/admin/review-queue
 *   GET /api/process_definitions/admin/missing-stage-config
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    /**
     * JOIN stage_configs ON stage_id — EXISTS/NOT EXISTS في فحص اكتمال stage_config
     * UNIQUE: مرحلة واحدة = config واحد
     */
    await queryInterface.addIndex(
      'stage_configs',
      ['stage_id'],
      {
        name: 'idx_stage_configs_stage_id',
        unique: true
      }
    )

    /**
     * يخدم: WHERE approval_status != APPROVED OR is_active = false ORDER BY updated_at
     * قائمة review-queue (غير موافق / غير نشط)
     */
    await queryInterface.addIndex(
      'process_definitions',
      ['approval_status', 'is_active', 'updated_at'],
      { name: 'idx_pd_review_queue' }
    )
  },

  async down (queryInterface) {
    await queryInterface.removeIndex('process_definitions', 'idx_pd_review_queue')
    await queryInterface.removeIndex('stage_configs', 'idx_stage_configs_stage_id')
  }
}
