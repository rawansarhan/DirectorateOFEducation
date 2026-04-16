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

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },

      type_trans_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'type_trans', key: 'id' },
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
        type: Sequelize.ENUM('pending','in_progress','completed','rejected','cancelled'),
        defaultValue: 'pending'
      },

      data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "يمكن تخزين البيانات الخاصة بالمعاملة هنا"
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

  down: async (queryInterface) => {
    await queryInterface.dropTable('transactions')
  }
}