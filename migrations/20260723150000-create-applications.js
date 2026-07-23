'use strict'

/**
 * تطبيق واحد = عميل واحد من عملاء التحديث الذاتي (citizen / employee / technical_team).
 * update_strategy يحدد إن كان يُفتح المتجر خارجياً أو يُحمَّل ويُثبَّت المثبت مباشرة داخل التطبيق.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('applications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },

      display_name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },

      package_name: {
        type: Sequelize.STRING(150),
        allowNull: true
      },

      apple_store_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },

      google_play_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },

      update_strategy: {
        type: Sequelize.ENUM('store', 'direct'),
        allowNull: false,
        defaultValue: 'store'
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
    await queryInterface.dropTable('applications')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_applications_update_strategy";')
  }
}
