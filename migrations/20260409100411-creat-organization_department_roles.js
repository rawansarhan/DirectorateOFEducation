'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('organization_department_roles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      organization_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'organization_department_roles',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'الدور الأعلى (Hierarchy)'
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      camunda_group_key: {
        type: Sequelize.STRING,
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

    // 🔥 منع التكرار لنفس الدور داخل نفس الدائرة والمنظمة
    await queryInterface.addConstraint('organization_department_roles', {
      fields: ['role_id', 'organization_id', 'department_id'],
      type: 'unique',
      name: 'unique_role_per_department_org'
    })
  },

  down: async queryInterface => {
    await queryInterface.dropTable('organization_department_roles')
  }
}
