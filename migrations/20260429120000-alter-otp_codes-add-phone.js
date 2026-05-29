'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('otp_codes', 'email', {
      type: Sequelize.STRING(100),
      allowNull: true
    })

    await queryInterface.addColumn('otp_codes', 'phone_number', {
      type: Sequelize.STRING(20),
      allowNull: true
    })

    await queryInterface.addColumn('otp_codes', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('otp_codes', 'email', {
      type: Sequelize.STRING(100),
      allowNull: false
    })
    await queryInterface.removeColumn('otp_codes', 'phone_number')
    await queryInterface.removeColumn('otp_codes', 'user_id')
  }
}
