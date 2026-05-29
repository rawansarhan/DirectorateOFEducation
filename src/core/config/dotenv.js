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

  // إعدادات access / refresh tokens (مع fallback آمن لـ JWT_SECRET الحالي)
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    (process.env.JWT_SECRET ? process.env.JWT_SECRET + '_refresh' : undefined),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};