const config = require('./config')
// Keep Windows Integrated Authentication for local development; use the
// cross-platform Tedious driver with SQL credentials on hosted Linux services.
const sql = config.sql.authMode === 'sql'
  ? require('mssql')
  : require('mssql/msnodesqlv8')

let poolPromise

function getPool() {
  if (!poolPromise) {
    const { authMode, server, port, database, driver, encrypt, trustServerCertificate, user, password } = config.sql
    if (!server) throw new Error('SQL_SERVER is not configured.')
    if (authMode === 'sql') {
      if (!user || !password) throw new Error('SQL_USER and SQL_PASSWORD are required when SQL_AUTH_MODE=sql.')
      poolPromise = new sql.ConnectionPool({
        server, port, database, user, password,
        options: { encrypt, trustServerCertificate },
        connectionTimeout: 10000, requestTimeout: 10000,
        pool: { min: 0, max: 10, idleTimeoutMillis: 30000 },
      })
    } else {
      const useSqlLogin = Boolean(user && password)
      const connectionString = [
        `Driver={${driver}}`, `Server=${server}`, `Database=${database}`,
        useSqlLogin ? `UID={${user.replaceAll('}', '}}')}}` : 'Trusted_Connection=yes',
        ...(useSqlLogin ? [`PWD={${password.replaceAll('}', '}}')}}`] : []),
        `Encrypt=${encrypt ? 'yes' : 'no'}`,
        `TrustServerCertificate=${trustServerCertificate ? 'yes' : 'no'}`,
      ].join(';') + ';'
      poolPromise = new sql.ConnectionPool({ connectionString, connectionTimeout: 5000, requestTimeout: 5000, pool: { min: 0, max: 10, idleTimeoutMillis: 30000 } })
    }
    poolPromise = poolPromise.connect()
      .catch((error) => { poolPromise = undefined; throw error })
  }
  return poolPromise
}

module.exports = { sql, getPool }
