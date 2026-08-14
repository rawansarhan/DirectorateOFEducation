'use strict'

/** إضافة رقم الهاتف على حجز الموعد */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('appointment_bookings')

    if (table.phone_number) {
      return
    }

    await queryInterface.addColumn('appointment_bookings', 'phone_number', {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: 'يبدأ بـ 09 ويتكون من 10 أرقام'
    })
  },

  async down (queryInterface) {
    const table = await queryInterface.describeTable('appointment_bookings')

    if (!table.phone_number) {
      return
    }

    await queryInterface.removeColumn('appointment_bookings', 'phone_number')
  }
}
