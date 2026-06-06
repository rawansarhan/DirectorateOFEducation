'use strict'

module.exports = {
  up: async queryInterface => {
    await queryInterface.dropTable('files').catch(() => {})
    await queryInterface.dropTable('fields').catch(() => {})
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_fields_field_type";'
    ).catch(() => {})
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_files_file_type";'
    ).catch(() => {})
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_files_type";'
    ).catch(() => {})
  },

  down: async () => {
    // legacy tables removed intentionally
  }
}
