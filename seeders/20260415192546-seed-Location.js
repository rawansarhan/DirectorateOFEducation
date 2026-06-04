'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('locations', [{
      name:"ريف دمشق",
      typeLocation_id: 1,
      parent_id: null,
      created_at: new Date(),
      updated_at: new Date()
    }], { ignoreDuplicates: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('employees', null, {});
  }
};
