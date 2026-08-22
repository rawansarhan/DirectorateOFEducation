'use strict'

/**
 * إجازات الموظف الرسمية (مرضية / إدارية / …)
 * منفصلة عن الغياب غير الأصولي.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('employee_leaves', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      self_card_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'employee_self_cards', key: 'id' },
        onDelete: 'CASCADE'
      },
      leave_type: {
        type: Sequelize.STRING(256),
        allowNull: false,
        comment: 'نوع الإجازة (مرضية / إدارية / بلا أجر …)'
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      duration: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      reason: {
        type: Sequelize.STRING(512),
        allowNull: true
      },
      document_type: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      document_number: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      document_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      source_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'transactions', key: 'id' },
        onDelete: 'SET NULL'
      },
      source_stage_code: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      source_content_hash: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      registered_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    })

    await queryInterface.addIndex('employee_leaves', ['self_card_id', 'created_at'], {
      name: 'idx_employee_leaves_card_created'
    })

    await queryInterface.addIndex(
      'employee_leaves',
      ['source_transaction_id', 'source_stage_code'],
      {
        unique: true,
        name: 'uq_employee_leaves_source_tx_stage'
      }
    )
  },

  async down (queryInterface) {
    await queryInterface.dropTable('employee_leaves')
  }
}
