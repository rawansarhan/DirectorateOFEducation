'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('transactions', 'genesis_hash', {
      type: Sequelize.STRING(64),
      allowNull: true
    })

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
        allowNull: true,
        references: { model: 'digital_signature', key: 'id' },
        onDelete: 'SET NULL'
      },
      link_order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      stage_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      stage_code: {
        type: Sequelize.STRING,
        allowNull: false
      },
      stage_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      stage_data_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      cumulative_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      previous_link_hash: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      link_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      genesis_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      challenge_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      signed_message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      user_key_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'user_key', key: 'id' },
        onDelete: 'CASCADE'
      },
      signed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
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
      ['transaction_id', 'link_order'],
      { unique: true, name: 'transaction_signature_links_tx_order_uq' }
    )

    await queryInterface.addIndex(
      'transaction_signature_links',
      ['transaction_id'],
      { name: 'transaction_signature_links_tx_idx' }
    )
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('transaction_signature_links')
    await queryInterface.removeColumn('transactions', 'genesis_hash')
  }
}
