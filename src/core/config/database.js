const { Sequelize } = require('sequelize')
const {
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT
} = require('./env')

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  pool: {
    max: 20,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
})

module.exports = sequelize