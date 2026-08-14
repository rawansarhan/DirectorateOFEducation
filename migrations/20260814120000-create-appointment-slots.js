'use strict'

/** مواعيد متاحة للحجز (فترة زمنية + سعة) */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('appointment_slots', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      appointment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'YYYY-MM-DD'
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'أقصى عدد حجوزات موافق عليها في هذه الفترة'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
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

    await queryInterface.addIndex('appointment_slots', ['appointment_date'])
    await queryInterface.addIndex('appointment_slots', ['is_active'])
  },

  async down (queryInterface) {
    await queryInterface.dropTable('appointment_slots')
  }
}
