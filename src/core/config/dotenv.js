const dotenv = require('dotenv');

//Initializes environment variables from .env file
dotenv.config();

//Exports environment variables for database and JWT
module.exports = {
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_PORT: process.env.DB_PORT,
  JWT_SECRET: process.env.JWT_SECRET,
};