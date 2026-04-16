require('dotenv').config(); // تحميل متغيرات البيئة من ملف .env

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5000
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + "_test",
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5000
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + "_prod",
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5000
  }
};
