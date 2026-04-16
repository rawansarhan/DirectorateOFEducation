'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('employees', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      employee_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
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
      national_number: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      father_name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      mother_name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      gender: {
        type: Sequelize.ENUM('male', 'female'),
        allowNull: false
      },

      marital_status: {
        type: Sequelize.ENUM('single', 'married'),
        allowNull: false
      },
      grade: {
        type: Sequelize.STRING,
        allowNull: true
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },

      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      address: {
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('employees')
  }
}
