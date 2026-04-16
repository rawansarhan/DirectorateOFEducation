'use strict'
//يمثل كل مهمة (Task) فعلية في Camunda مرتبطة بمعاملة (transaction) معينة:
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('task_instance', {
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
        onDelete: 'CASCADE',
        comment: "المعاملة التي تنتمي إليها المهمة"
      },

      camunda_task_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: "الـ ID الخاص بالمهمة في Camunda"
      },

      camunda_task_key: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "الـ key الخاص بالمهمة في نموذج BPMN"
      },

      assigned_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        comment: "الموظف المسؤول عن تنفيذ المهمة"
      },

      status: {
        type: Sequelize.ENUM('pending','in_progress','completed','cancelled'),
        defaultValue: 'pending',
        allowNull: false
      },

      started_at: {
        type: Sequelize.DATE,
        allowNull: true
      },

      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.dropTable('task_instance')
  }
}