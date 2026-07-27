const {
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_HOST,
  DB_PORT
} = require('../src/core/config/env')

const baseConfig = {
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  host: DB_HOST,
  dialect: 'postgres',
  port: DB_PORT
}

module.exports = {
  development: { ...baseConfig },
  test: {
    ...baseConfig,
    database: `${DB_NAME}_test`
  },
  production: {
    ...baseConfig,
    database: `${DB_NAME}_prod`
  }
}
