'use strict'

/**
 * الشكاوى (is_complaint=true) لا ترتبط بنوع معاملة — type_trans_id يجب أن يكون NULL.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE process_definitions
      ALTER COLUMN type_trans_id DROP NOT NULL
    `)
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE process_definitions
      SET type_trans_id = (
        SELECT id FROM type_trans ORDER BY id ASC LIMIT 1
      )
      WHERE type_trans_id IS NULL
    `)

    await queryInterface.sequelize.query(`
      ALTER TABLE process_definitions
      ALTER COLUMN type_trans_id SET NOT NULL
    `)
  }
}
