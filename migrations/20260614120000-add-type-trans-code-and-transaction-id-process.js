'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const typeTransTable = await queryInterface.describeTable('type_trans')

    if (!typeTransTable.code) {
      await queryInterface.addColumn('type_trans', 'code', {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true
      })

      await queryInterface.sequelize.query(`
        UPDATE type_trans
        SET code = CONCAT('TXN', id)
        WHERE code IS NULL OR code = ''
      `)

      await queryInterface.changeColumn('type_trans', 'code', {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      })
    }

    const transactionsTable = await queryInterface.describeTable('transactions')

    if (!transactionsTable.id_process) {
      await queryInterface.addColumn('transactions', 'id_process', {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: true
      })
    }
  },

  async down (queryInterface) {
    const transactionsTable = await queryInterface.describeTable('transactions')

    if (transactionsTable.id_process) {
      await queryInterface.removeColumn('transactions', 'id_process')
    }

    const typeTransTable = await queryInterface.describeTable('type_trans')

    if (typeTransTable.code) {
      await queryInterface.removeColumn('type_trans', 'code')
    }
  }
}
