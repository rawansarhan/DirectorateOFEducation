'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'first_name', {
      type: Sequelize.STRING(64),
      allowNull: true
    })

    await queryInterface.addColumn('users', 'last_name', {
      type: Sequelize.STRING(64),
      allowNull: true
    })

    await queryInterface.addColumn('users', 'father_name', {
      type: Sequelize.STRING(64),
      allowNull: true
    })

    await queryInterface.addColumn('users', 'mother_name', {
      type: Sequelize.STRING(64),
      allowNull: true
    })

    await queryInterface.addColumn('users', 'national_id', {
      type: Sequelize.STRING(11),
      allowNull: true,
      unique: true
    })
  },

  down: async queryInterface => {
    await queryInterface.removeColumn('users', 'national_id')
    await queryInterface.removeColumn('users', 'mother_name')
    await queryInterface.removeColumn('users', 'father_name')
    await queryInterface.removeColumn('users', 'last_name')
    await queryInterface.removeColumn('users', 'first_name')
  }
}
