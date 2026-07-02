'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      code: {
        type: Sequelize.STRING,
        allowNull: true
      },

      id_process: {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: true,
        comment: 'رقم المعاملة المعروض — مثال TXN-2024-441'
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },

      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },

      status: {
        type: Sequelize.ENUM(
          'draft',
          'submitted',
          'in_progress',
          'completed',
          'rejected',
          'cancelled'
        ),
        defaultValue: 'draft'
      },

      data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'يمكن تخزين البيانات الخاصة بالمعاملة هنا'
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
  },

  down: async queryInterface => {
    await queryInterface.dropTable('transactions')
  }
}
