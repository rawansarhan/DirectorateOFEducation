'use strict'

/**
 * فصل البطاقة الذاتية عن حساب الدخول:
 * - user_id اختياري (NULL للمعلمين/الميدانيين بلا حساب موظف)
 * - is_active لحالة الملف الوظيفي
 * - فهرس فريد جزئي على national_id
 */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = 'employee_self_cards'

    // إسقاط FK الحالي ثم إعادة إنشائه مع SET NULL + عمود اختياري
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
          AND kcu.column_name = 'user_id'
        LIMIT 1;

        IF fk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE employee_self_cards DROP CONSTRAINT %I', fk_name);
        END IF;
      END $$;
    `)

    await queryInterface.changeColumn(table, 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    })

    await queryInterface.sequelize.query(`
      ALTER TABLE employee_self_cards
      ADD CONSTRAINT employee_self_cards_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `)

    const desc = await queryInterface.describeTable(table)
    if (!desc.is_active) {
      await queryInterface.addColumn(table, 'is_active', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      })
    }

    await queryInterface.addIndex(table, ['is_active'], {
      name: 'idx_employee_self_cards_is_active'
    })

    await queryInterface.addIndex(table, ['full_name'], {
      name: 'idx_employee_self_cards_full_name'
    })

    await queryInterface.addIndex(table, ['self_number'], {
      name: 'idx_employee_self_cards_self_number'
    })

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_self_cards_national_id
      ON employee_self_cards (national_id)
      WHERE national_id IS NOT NULL AND btrim(national_id) <> ''
    `)
  },

  async down (queryInterface, Sequelize) {
    const table = 'employee_self_cards'

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_employee_self_cards_national_id
    `)

    await queryInterface.removeIndex(table, 'idx_employee_self_cards_self_number')
    await queryInterface.removeIndex(table, 'idx_employee_self_cards_full_name')
    await queryInterface.removeIndex(table, 'idx_employee_self_cards_is_active')

    const desc = await queryInterface.describeTable(table)
    if (desc.is_active) {
      await queryInterface.removeColumn(table, 'is_active')
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE employee_self_cards
      DROP CONSTRAINT IF EXISTS employee_self_cards_user_id_fkey
    `)

    await queryInterface.sequelize.query(`
      UPDATE employee_self_cards
      SET user_id = (
        SELECT u.id FROM users u
        WHERE u.national_id = employee_self_cards.national_id
        LIMIT 1
      )
      WHERE user_id IS NULL
    `)

    await queryInterface.changeColumn(table, 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    })

    await queryInterface.sequelize.query(`
      ALTER TABLE employee_self_cards
      ADD CONSTRAINT employee_self_cards_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `)
  }
}
