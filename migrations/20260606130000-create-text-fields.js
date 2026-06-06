'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('text_fields', {
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
      input_type: {
        type: Sequelize.ENUM('text', 'string', 'int', 'phoneNumber', 'email'),
        allowNull: false
      },
      regex: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      max_length: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      min_length: {
        type: Sequelize.INTEGER,
        allowNull: true
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
    await queryInterface.dropTable('text_fields')
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_text_fields_input_type";'
    )
  }
}
