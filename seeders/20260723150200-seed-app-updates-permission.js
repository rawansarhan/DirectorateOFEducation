'use strict'

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert(
      'permissions',
      [{ name: 'APP_VERSION_MANAGE', created_at: new Date(), updated_at: new Date() }],
      { ignoreDuplicates: true }
    )
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('permissions', { name: 'APP_VERSION_MANAGE' }, {})
  }
}
