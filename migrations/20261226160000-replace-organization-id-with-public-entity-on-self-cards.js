'use strict'

/**
 * استبدال organization_id بـ public_entity (الجهة العامة) في employee_self_cards.
 * يعمل بشكل آمن إذا كان أحد العمودين موجوداً مسبقاً أو لا.
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = 'employee_self_cards'
    const desc = await queryInterface.describeTable(table)

    if (desc.organization_id) {
      await queryInterface.sequelize.query(`
        DO $$
        DECLARE
          fk_name text;
        BEGIN
          SELECT tc.constraint_name INTO fk_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'employee_self_cards'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'organization_id'
          LIMIT 1;

          IF fk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE employee_self_cards DROP CONSTRAINT %I', fk_name);
          END IF;
        END $$;
      `)

      await queryInterface.removeColumn(table, 'organization_id')
    }

    if (!desc.public_entity) {
      await queryInterface.addColumn(table, 'public_entity', {
        type: Sequelize.STRING(256),
        allowNull: true,
        comment: 'الجهة العامة'
      })
    }
  },

  async down (queryInterface, Sequelize) {
    const table = 'employee_self_cards'
    const desc = await queryInterface.describeTable(table)

    if (desc.public_entity) {
      await queryInterface.removeColumn(table, 'public_entity')
    }

    if (!desc.organization_id) {
      await queryInterface.addColumn(table, 'organization_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'SET NULL'
      })
    }
  }
}
