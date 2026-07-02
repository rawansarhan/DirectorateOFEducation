'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    const transactionsTable = await queryInterface.describeTable('transactions')

    if (!transactionsTable.genesis_hash) {
      await queryInterface.addColumn('transactions', 'genesis_hash', {
        type: Sequelize.STRING(64),
        allowNull: true
      })
    }

    const tables = await queryInterface.showAllTables()
    const hasLinksTable = tables.some(
      table => String(table).toLowerCase() === 'transaction_signature_links'
    )

    if (!hasLinksTable) {
      await queryInterface.createTable('transaction_signature_links', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        transaction_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'transactions', key: 'id' },
          onDelete: 'CASCADE'
        },
        digital_signature_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'digital_signature', key: 'id' },
          onDelete: 'CASCADE'
        },
        challenge_id: {
          type: Sequelize.UUID,
          allowNull: true
        },
        stage_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        stage_code: {
          type: Sequelize.STRING,
          allowNull: true
        },
        signature_order: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        stage_data_hash: {
          type: Sequelize.STRING(64),
          allowNull: false
        },
        cumulative_hash: {
          type: Sequelize.STRING(64),
          allowNull: false
        },
        link_hash: {
          type: Sequelize.STRING(64),
          allowNull: false
        },
        previous_link_hash: {
          type: Sequelize.STRING(64),
          allowNull: true
        },
        genesis_hash: {
          type: Sequelize.STRING(64),
          allowNull: false
        },
        signed_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      })

      await queryInterface.addIndex(
        'transaction_signature_links',
        ['transaction_id', 'signature_order'],
        { name: 'idx_tx_signature_links_tx_order', unique: true }
      )
    }
  },

  async down (queryInterface) {
    await queryInterface.dropTable('transaction_signature_links')
    await queryInterface.removeColumn('transactions', 'genesis_hash')
  }
}
