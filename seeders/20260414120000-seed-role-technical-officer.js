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
        name: 'مدير التربية',
        code: 'DIRECTOR_OF_EDUCATION',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'مدير مكتب المدير',
        code: 'DIRECTOR_OFFICE_MANAGER',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'معاون المدير',
        code: 'ASSISTANT_DIRECTOR',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'مدير دائرة',
        code: 'DEPARTMENT_DIRECTOR',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'مدير شعبة',
        code: 'DIVISION_MANAGER',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'موظف',
        code: 'EMPLOYEE',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'مواطن',
        code: 'CITIZEN',
        created_at: new Date(),
        updated_at: new Date()
      }
    ])
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('roles', {
      code: [
        'TECHNICAL_OFFICER',
        'DIRECTOR_OF_EDUCATION',
        'DIRECTOR_OFFICE_MANAGER',
        'ASSISTANT_DIRECTOR',
        'DEPARTMENT_DIRECTOR',
        'DIVISION_MANAGER',
        'EMPLOYEE',
        'CITIZEN'
      ]
    }, {})
  }
}
