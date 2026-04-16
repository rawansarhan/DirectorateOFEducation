'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_role_assignments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      organization_department_role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'organization_department_roles',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: "في حال وجود أكثر من موظف بنفس الدور"
      },

      start_date: {
        type: Sequelize.DATE,
        allowNull: true
      },

      end_date: {
        type: Sequelize.DATE,
        allowNull: true
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // 🔥 منع التكرار
    await queryInterface.addConstraint('user_role_assignments', {
      fields: ['user_id', 'organization_department_role_id'],
      type: 'unique',
      name: 'unique_user_role_context'
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_role_assignments')
  }
}