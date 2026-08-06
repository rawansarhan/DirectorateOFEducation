'use strict'

/** min_date / max_date: YYYY-MM-DD | today | JSON relative bound */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('date_pickers', 'min_date', {
      type: Sequelize.STRING(255),
      allowNull: false
    })

    await queryInterface.changeColumn('date_pickers', 'max_date', {
      type: Sequelize.STRING(255),
      allowNull: false
    })
  },

  async down (queryInterface, Sequelize) {
    // القيم غير المطلقة لن تتحول بأمان — يُفترض الرجوع يدوياً إن لزم
    await queryInterface.changeColumn('date_pickers', 'min_date', {
      type: Sequelize.DATEONLY,
      allowNull: false
    })

    await queryInterface.changeColumn('date_pickers', 'max_date', {
      type: Sequelize.DATEONLY,
      allowNull: false
    })
  }
}
