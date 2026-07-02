'use strict'

module.exports = {
  async up (queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    const exists = tables.some(
      table => String(table).toLowerCase() === 'document_final_transactions'
    )

    if (exists) {
      return
    }

    await queryInterface.createTable('document_final_transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'transactions', key: 'id' },
        onDelete: 'CASCADE'
      },
      file_path: {
        type: Sequelize.STRING(512),
        allowNull: false
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      mime_type: {
        type: Sequelize.STRING(128),
        allowNull: false,
        defaultValue: 'application/pdf'
      },
      file_size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      qr_payload_snapshot: {
        type: Sequelize.JSON,
        allowNull: true
      },
      generated_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
      },
      generated_at: {
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

    await queryInterface.addIndex('document_final_transactions', ['transaction_id'])
  },

  async down (queryInterface) {
    await queryInterface.dropTable('document_final_transactions')
  }
}
