'use strict';


module.exports = {
up: async (queryInterface, Sequelize) => {
await queryInterface.createTable('permissions', {
id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
name: { type: Sequelize.STRING, allowNull: false, unique: true },
created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
});
},
down: async (queryInterface) => {
await queryInterface.dropTable('permissions');
}
};