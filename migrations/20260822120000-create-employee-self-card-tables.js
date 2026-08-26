'use strict'

/**
 * جداول البطاقة الذاتية (ملف شؤون الموظفين).
 * الكتابة تتم عبر SYNC_SELF_CARD بعد ختم مرحلة المعاملة.
 * الربط مع users اختياري (انظر migration decouple).
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('employee_self_cards', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      public_entity: {
        type: Sequelize.STRING(256),
        allowNull: true,
        comment: 'الجهة العامة'
      },
      self_number: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'الرقم الذاتي'
      },
      national_id: {
        type: Sequelize.STRING(32),
        allowNull: true
      },
      insurance_number: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'الرقم التأميني'
      },
      full_name: {
        type: Sequelize.STRING(256),
        allowNull: true
      },
      father_name: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      mother_name: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      birth_place: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      birth_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      registry_place: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      registry_number: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      gender: {
        type: Sequelize.STRING(32),
        allowNull: true
      },
      nationality: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      foreign_language: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      education_degree: {
        type: Sequelize.STRING(256),
        allowNull: true
      },
      current_residence: {
        type: Sequelize.STRING(512),
        allowNull: true
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

    const historyCommon = {
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
    }

    await queryInterface.createTable('employee_training_courses', {
      ...historyCommon,
      title: { type: Sequelize.STRING(256), allowNull: false },
      provider: { type: Sequelize.STRING(256), allowNull: true },
      topic: { type: Sequelize.STRING(256), allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      duration: { type: Sequelize.STRING(64), allowNull: true },
      certificate_number: { type: Sequelize.STRING(128), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      normalized_title: { type: Sequelize.STRING(256), allowNull: true }
    })

    await queryInterface.createTable('employee_employment_statuses', {
      ...historyCommon,
      work_center: { type: Sequelize.STRING(256), allowNull: true },
      job_title: { type: Sequelize.STRING(256), allowNull: true },
      job_type: { type: Sequelize.STRING(128), allowNull: true },
      category: { type: Sequelize.STRING(128), allowNull: true },
      salary: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      emergency_change_date: { type: Sequelize.DATEONLY, allowNull: true },
      document_reason: { type: Sequelize.STRING(512), allowNull: true },
      document_type: { type: Sequelize.STRING(128), allowNull: true },
      document_number: { type: Sequelize.STRING(128), allowNull: true },
      document_date: { type: Sequelize.DATEONLY, allowNull: true }
    })

    await queryInterface.createTable('employee_irregular_absences', {
      ...historyCommon,
      duration: { type: Sequelize.STRING(64), allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      document_type: { type: Sequelize.STRING(128), allowNull: true },
      document_number: { type: Sequelize.STRING(128), allowNull: true },
      document_date: { type: Sequelize.DATEONLY, allowNull: true }
    })

    await queryInterface.createTable('employee_rewards', {
      ...historyCommon,
      reward_type: { type: Sequelize.STRING(256), allowNull: false },
      reason: { type: Sequelize.STRING(512), allowNull: true },
      document_type: { type: Sequelize.STRING(128), allowNull: true },
      document_number: { type: Sequelize.STRING(128), allowNull: true },
      document_date: { type: Sequelize.DATEONLY, allowNull: true }
    })

    await queryInterface.createTable('employee_sanctions', {
      ...historyCommon,
      sanction_type: { type: Sequelize.STRING(256), allowNull: false },
      reason: { type: Sequelize.STRING(512), allowNull: true },
      document_type: { type: Sequelize.STRING(128), allowNull: true },
      document_number: { type: Sequelize.STRING(128), allowNull: true },
      document_date: { type: Sequelize.DATEONLY, allowNull: true }
    })

    const historyTables = [
      'employee_training_courses',
      'employee_employment_statuses',
      'employee_irregular_absences',
      'employee_rewards',
      'employee_sanctions'
    ]

    for (const table of historyTables) {
      await queryInterface.addIndex(table, ['self_card_id', 'created_at'], {
        name: `idx_${table}_card_created`
      })
      await queryInterface.addIndex(
        table,
        ['source_transaction_id', 'source_stage_code'],
        {
          unique: true,
          name: `uq_${table}_source_tx_stage`
        }
      )
    }

    await queryInterface.addIndex('employee_training_courses', ['normalized_title'], {
      name: 'idx_employee_training_courses_normalized_title'
    })
  },

  async down (queryInterface) {
    await queryInterface.dropTable('employee_sanctions')
    await queryInterface.dropTable('employee_rewards')
    await queryInterface.dropTable('employee_irregular_absences')
    await queryInterface.dropTable('employee_employment_statuses')
    await queryInterface.dropTable('employee_training_courses')
    await queryInterface.dropTable('employee_self_cards')
  }
}
