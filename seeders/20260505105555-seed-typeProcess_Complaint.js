'use strict'
const { QueryTypes } = require('sequelize')

module.exports = {
  up: async (queryInterface) => {
await queryInterface.bulkInsert('type_trans', [
  {
    name: 'شكوى',
    is_active: true,
        created_at: new Date(),
        updated_at: new Date()
  }
], { ignoreDuplicates: true })
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('type_trans', {
  name: 'شكوى'
}, {})
  }
}
