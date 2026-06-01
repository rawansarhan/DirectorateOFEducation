const path = require('path')
const { Sequelize } = require('sequelize')
const dotenv = require('dotenv')

// Always load .env from project root (not cwd-dependent)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const dbPort = Number.parseInt(process.env.DB_PORT, 10) || 5000
const dbHost = process.env.DB_HOST || '127.0.0.1'
const dbName = (process.env.DB_NAME || '').trim()
const dbUser = process.env.DB_USER || 'postgres'
const dbPassword = String(process.env.DB_PASSWORD || '').replace(/^"|"$/g, '')

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: false
})

module.exports = sequelize
