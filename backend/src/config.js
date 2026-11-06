require('dotenv').config()

module.exports = {
  port: Number(process.env.PORT || 3001),
  frontendPort: Number(process.env.FRONTEND_PORT || 5173),
  frontendOrigins: (process.env.FRONTEND_ORIGINS || '')
    .split(',').map((value) => value.trim()).filter(Boolean),
  sql: {
    authMode: process.env.SQL_AUTH_MODE || 'windows',
    server: process.env.SQL_SERVER || '',
    port: Number(process.env.SQL_PORT || 1433),
    database: process.env.SQL_DATABASE || 'HemoTrackDB',
    driver: process.env.SQL_DRIVER || 'ODBC Driver 18 for SQL Server',
    user: process.env.SQL_USER || '',
    password: process.env.SQL_PASSWORD || '',
    encrypt: process.env.SQL_ENCRYPT !== 'false',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
  },
}
