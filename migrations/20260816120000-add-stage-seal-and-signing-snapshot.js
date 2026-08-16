'use strict'

/**
 * مرحلة 1 — ختم لقطة المرحلة:
 * - process_instance_stage: content_hash + sealed + sealed_at + challenge_id
 * - transaction_signing_challenges: payload_snapshot + stage_data_hash
 *
 * هاش USB يضم لقطة widgets/decision وليس المعرّفات فقط.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('process_instance_stage', 'content_hash', {
      type: Sequelize.STRING(64),
      allowNull: true
    })

    await queryInterface.addColumn('process_instance_stage', 'sealed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    await queryInterface.addColumn('process_instance_stage', 'sealed_at', {
      type: Sequelize.DATE,
      allowNull: true
    })

    await queryInterface.addColumn('process_instance_stage', 'challenge_id', {
      type: Sequelize.UUID,
      allowNull: true
    })

    await queryInterface.addColumn(
      'transaction_signing_challenges',
      'payload_snapshot',
      {
        type: Sequelize.JSON,
        allowNull: true
      }
    )

    await queryInterface.addColumn(
      'transaction_signing_challenges',
      'stage_data_hash',
      {
        type: Sequelize.STRING(64),
        allowNull: true
      }
    )

    await queryInterface.addIndex('process_instance_stage', {
      name: 'idx_process_instance_stage_tx_sealed',
      fields: ['transaction_id', 'sealed']
    })
  },

  async down (queryInterface) {
    await queryInterface.removeIndex(
      'process_instance_stage',
      'idx_process_instance_stage_tx_sealed'
    )

    await queryInterface.removeColumn(
      'transaction_signing_challenges',
      'stage_data_hash'
    )
    await queryInterface.removeColumn(
      'transaction_signing_challenges',
      'payload_snapshot'
    )
    await queryInterface.removeColumn('process_instance_stage', 'challenge_id')
    await queryInterface.removeColumn('process_instance_stage', 'sealed_at')
    await queryInterface.removeColumn('process_instance_stage', 'sealed')
    await queryInterface.removeColumn('process_instance_stage', 'content_hash')
  }
}
