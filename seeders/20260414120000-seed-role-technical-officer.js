'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('roles', [
      {
        name: 'مسؤول تقني',
        code: 'TECHNICAL_OFFICER',
        created_at: new Date(),
        updated_at: new Date()
      },
       {
        name: 'مواطن',
        code: 'CITIZEN',
        created_at: new Date(),
        updated_at: new Date()
      }

    ], { ignoreDuplicates: true })
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('roles', {
      code: [
        'TECHNICAL_OFFICER',
        'CITIZEN'
      ]
    }, {})
  }
}
