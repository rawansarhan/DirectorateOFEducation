'use strict'

/** حجوزات المستخدمين على مواعيد */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('appointment_bookings', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      appointment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'appointment_slots', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      father_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      mother_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      national_id: {
        type: Sequelize.STRING(11),
        allowNull: false
      },
      phone_number: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'يبدأ بـ 09 ويتكون من 10 أرقام'
      },
      identity_image_path: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'مسار صورة الهوية /uploads/...'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'postponed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      queue_order: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ترتيب ضمن الموعد بعد الموافقة فقط'
      },
      attended: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null,
        comment: 'هل حضر الموعد — يُعدَّل فقط في يوم الموعد أو بعده'
      },
      decision_note: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      decided_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      decided_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('appointment_bookings', ['appointment_id'])
    await queryInterface.addIndex('appointment_bookings', ['user_id'])
    await queryInterface.addIndex('appointment_bookings', ['status'])
    await queryInterface.addIndex('appointment_bookings', ['national_id'])
  },

  async down (queryInterface) {
    await queryInterface.dropTable('appointment_bookings')
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_appointment_bookings_status";'
    )
  }
}
