'use strict'

/**
 * فهارس فريدة جزئية لمنع تكرار:
 * user_id (موجود أصلاً unique),
 * national_id (موجود من decouple),
 * self_number, insurance_number
 */
module.exports = {
  async up (queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_self_cards_self_number
      ON employee_self_cards (self_number)
      WHERE self_number IS NOT NULL AND btrim(self_number) <> ''
    `)

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_self_cards_insurance_number
      ON employee_self_cards (insurance_number)
      WHERE insurance_number IS NOT NULL AND btrim(insurance_number) <> ''
    `)
  },

  async down (queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_employee_self_cards_self_number
    `)
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_employee_self_cards_insurance_number
    `)
  }
}
