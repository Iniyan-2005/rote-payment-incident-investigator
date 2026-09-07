require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  dbPoolMax: Number(process.env.DB_POOL_MAX || 5),
  logLevel: process.env.LOG_LEVEL || 'info'
};
