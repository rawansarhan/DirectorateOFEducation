'use strict'

/**
 * حذف القيمة 'cancelled' من حالة المعاملة (transactions.status).
 * أي معاملة بحالة 'cancelled' تُرحَّل إلى 'rejected'.
 *
 * Postgres لا يسمح بحذف قيمة من ENUM مباشرة، لذا:
 *   1) ترحيل الصفوف cancelled → rejected
 *   2) إنشاء نوع ENUM جديد بدون cancelled وتبديل العمود إليه
 */

const ENUM_NAME = 'enum_transactions_status'
const ENUM_OLD = 'enum_transactions_status_old'

const VALUES_WITHOUT_CANCELLED = [
  'draft',
  'submitted',
  'in_progress',
  'completed',
  'rejected'
]

const VALUES_WITH_CANCELLED = [...VALUES_WITHOUT_CANCELLED, 'cancelled']

function buildEnumValuesSql (values) {
  return values.map(value => `'${value}'`).join(', ')
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        "UPDATE \"transactions\" SET \"status\" = 'rejected' WHERE \"status\" = 'cancelled';",
        { transaction }
      )

      await queryInterface.sequelize.query(
        'ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT;',
        { transaction }
      )

      await queryInterface.sequelize.query(
        `ALTER TYPE "${ENUM_NAME}" RENAME TO "${ENUM_OLD}";`,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `CREATE TYPE "${ENUM_NAME}" AS ENUM(${buildEnumValuesSql(VALUES_WITHOUT_CANCELLED)});`,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "${ENUM_NAME}" USING "status"::text::"${ENUM_NAME}";`,
        { transaction }
      )

      await queryInterface.sequelize.query(
        "ALTER TABLE \"transactions\" ALTER COLUMN \"status\" SET DEFAULT 'draft';",
        { transaction }
      )

      await queryInterface.sequelize.query(
        `DROP TYPE "${ENUM_OLD}";`,
        { transaction }
      )
    })
  },

  async down (queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT;',
        { transaction }
      )

      await queryInterface.sequelize.query(
        `ALTER TYPE "${ENUM_NAME}" RENAME TO "${ENUM_OLD}";`,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `CREATE TYPE "${ENUM_NAME}" AS ENUM(${buildEnumValuesSql(VALUES_WITH_CANCELLED)});`,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "${ENUM_NAME}" USING "status"::text::"${ENUM_NAME}";`,
        { transaction }
      )

      await queryInterface.sequelize.query(
        "ALTER TABLE \"transactions\" ALTER COLUMN \"status\" SET DEFAULT 'draft';",
        { transaction }
      )

      await queryInterface.sequelize.query(
        `DROP TYPE "${ENUM_OLD}";`,
        { transaction }
      )
    })
  }
}
