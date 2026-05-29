'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('process_instances', 'task_lock_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    })

    await queryInterface.addColumn('process_instances', 'task_lock_task_id', {
      type: Sequelize.STRING,
      allowNull: true
    })

    await queryInterface.addColumn('process_instances', 'task_locked_at', {
      type: Sequelize.DATE,
      allowNull: true
    })

    await queryInterface.addColumn('process_instances', 'task_lock_expires_at', {
      type: Sequelize.DATE,
      allowNull: true
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('process_instances', 'task_lock_expires_at')
    await queryInterface.removeColumn('process_instances', 'task_locked_at')
    await queryInterface.removeColumn('process_instances', 'task_lock_task_id')
    await queryInterface.removeColumn('process_instances', 'task_lock_user_id')
  }
}
