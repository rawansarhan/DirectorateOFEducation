const dotenv = require('dotenv')
dotenv.config()

if (!process.env.CAMUNDA_URL) {
  throw new Error('CAMUNDA_URL is not defined in .env')
}

module.exports = {
  CAMUNDA_URL: process.env.CAMUNDA_URL
}