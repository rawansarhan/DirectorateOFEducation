'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('process_instance_stage', {
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

      stage_code: {
        type: Sequelize.STRING,
        allowNull: false
      },

      stage_name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "بيانات المرحلة"
      },

      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        comment: "الموظف المسؤول عن المرحلة"
      },

      status: {
        type: Sequelize.ENUM('pending','in_progress','completed','rejected'),
        defaultValue: 'pending'
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
    await queryInterface.dropTable('process_instance_stage')
  }
}