'use strict'

/**
 * فهارس لـ GET /api/transaction/{transactionId}/first-stage
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    /**
     * يخدم: stageRepository.findFirstByProcessId
     * الاستعلام: WHERE process_definition_id = ? ORDER BY id ASC LIMIT 1
     */
    await queryInterface.addIndex(
      'stages',
      ['process_definition_id', 'id'],
      { name: 'idx_stages_proc_id' }
    )

    /**
     * يخدم: processInstanceStageRepository.findByTransactionAndStageCode
     * الاستعلام: WHERE transaction_id = ? AND stage_code = ?
     */
    await queryInterface.addIndex(
      'process_instance_stage',
      ['transaction_id', 'stage_code'],
      { name: 'idx_pis_transaction_stage_code' }
    )
  },

  async down (queryInterface) {
    await queryInterface.removeIndex(
      'process_instance_stage',
      'idx_pis_transaction_stage_code'
    )
    await queryInterface.removeIndex('stages', 'idx_stages_proc_id')
  }
}
