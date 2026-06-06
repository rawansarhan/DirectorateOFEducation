'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('file_pickers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_widget: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true
      },
      label: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      max_size_mb: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      allowed_extensions: {
        type: Sequelize.JSON,
        allowNull: false
      },
      allow_multiple: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
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
  },

  down: async queryInterface => {
    await queryInterface.dropTable('file_pickers')
  }
}
