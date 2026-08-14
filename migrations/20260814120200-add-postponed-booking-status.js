'use strict'

/** إضافة حالة تأجيل الحجز عند تعديل الموعد */
module.exports = {
  async up (queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_appointment_bookings_status" ADD VALUE IF NOT EXISTS \'postponed\';'
    )
  },

  async down () {
    // PostgreSQL لا يدعم حذف قيمة من ENUM بسهولة بدون إعادة بناء النوع
  }
}
