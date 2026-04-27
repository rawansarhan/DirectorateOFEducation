'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('role_permissions', {
      organization_department_roles_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_department_roles', key: 'id' },
        onDelete: 'CASCADE'
      },
      permission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'permissions', key: 'id' },
        onDelete: 'CASCADE'
      }
    })
    await queryInterface.addConstraint('role_permissions', {
      fields: ['organization_department_roles_id', 'permission_id'],
      type: 'primary key',
      name: 'pk_role_permissions'
    })
  },
  down: async queryInterface => {
    await queryInterface.dropTable('role_permissions')
  }
}
