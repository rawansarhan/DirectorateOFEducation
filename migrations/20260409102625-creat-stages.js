'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      process_definition_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'process_definitions',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      code: {
        type: Sequelize.STRING,
        allowNull: false
      },

      type: {
        type: Sequelize.ENUM(
          'USER_TASK',       // إدخال / تعديل
          'START EVENT',        // توقيع
          'END EVENT',     // حسابات
          'SERVICE TASK',        // توليد مستند
          'UPLOAD',          // رفع ملفات
          'DECISION',        // شرط (gateway)
          'NOTIFICATION' ,    // إشعار
          'END'
        ),
        allowNull: false
      },

      camunda_task_key: {
        type: Sequelize.STRING,
        allowNull: true
      },

      order: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      is_active: {
        type: Sequelize.BOOLEAN,
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

  down: async (queryInterface) => {
    await queryInterface.dropTable('stages')
  }
}