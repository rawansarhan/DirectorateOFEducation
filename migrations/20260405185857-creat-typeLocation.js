'use strict'
//يمثل كل مهمة (Task) فعلية في Camunda مرتبطة بمعاملة (transaction) معينة:
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('typeLocation', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      name: {
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

  down: async (queryInterface) => {
    await queryInterface.dropTable('typeLocation')
  }
}