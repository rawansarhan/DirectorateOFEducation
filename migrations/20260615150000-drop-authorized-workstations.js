'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.dropTable('authorized_workstations')
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('authorized_workstations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      organization_department_roles_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_department_roles', key: 'id' },
        onDelete: 'CASCADE'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: false
      },
      device_label: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
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
  }
}
