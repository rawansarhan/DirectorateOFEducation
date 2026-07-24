'use strict'

/**
 * صف واحد = (تطبيق × منصة × إصدار). platform منفصل تماماً عن نوع الملف —
 * لا تضع رابط MSIX/EXE في صف platform=android والعكس (انظر توثيق الميزة).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('app_versions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      application_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'applications', key: 'id' },
        onDelete: 'CASCADE'
      },

      platform: {
        type: Sequelize.ENUM('android', 'ios', 'windows'),
        allowNull: false
      },

      version_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },

      version_code: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      apk_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },

      apk_size: {
        type: Sequelize.BIGINT,
        allowNull: true
      },

      changelog: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },

      force_update_below_version_code: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      soft_update_below_version_code: {
        type: Sequelize.INTEGER,
        allowNull: true
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

    await queryInterface.addIndex('app_versions', ['application_id', 'platform', 'status', 'version_code'], {
      name: 'idx_app_versions_lookup'
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('app_versions', 'idx_app_versions_lookup')
    await queryInterface.dropTable('app_versions')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_app_versions_platform";')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_app_versions_status";')
  }
}
