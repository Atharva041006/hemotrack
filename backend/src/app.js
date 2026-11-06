const express = require('express')
const { getPool } = require('./db')
const api = require('./api')
const config = require('./config')

const app = express()
app.disable('x-powered-by')
app.use((req, res, next) => {
  const origin = req.headers.origin
  const localOrigins = process.env.NODE_ENV === 'production' ? [] : [`http://localhost:${config.frontendPort}`, `http://127.0.0.1:${config.frontendPort}`]
  if (!origin || localOrigins.includes(origin) || config.frontendOrigins.includes(origin)) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use(express.json({ limit: '32kb' }))
app.use('/api', api)

app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }))

app.get('/api/health/ready', async (_req, res) => {
  try {
    const pool = await getPool()
    await pool.request().query('SELECT 1 AS connected')
    res.json({ status: 'ready', database: 'connected' })
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' })
  }
})

app.get('/api/donors/summary', async (_req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT COUNT_BIG(*) AS donorCount,
        SUM(CASE WHEN BloodGroup = 'A+' THEN 1 ELSE 0 END) AS [A+],
        SUM(CASE WHEN BloodGroup = 'A-' THEN 1 ELSE 0 END) AS [A-],
        SUM(CASE WHEN BloodGroup = 'B+' THEN 1 ELSE 0 END) AS [B+],
        SUM(CASE WHEN BloodGroup = 'B-' THEN 1 ELSE 0 END) AS [B-],
        SUM(CASE WHEN BloodGroup = 'O+' THEN 1 ELSE 0 END) AS [O+],
        SUM(CASE WHEN BloodGroup = 'O-' THEN 1 ELSE 0 END) AS [O-],
        SUM(CASE WHEN BloodGroup = 'AB+' THEN 1 ELSE 0 END) AS [AB+],
        SUM(CASE WHEN BloodGroup = 'AB-' THEN 1 ELSE 0 END) AS [AB-]
      FROM dbo.Donor;
    `)
    const row = result.recordset[0]
    res.json({ data: { donorCount: Number(row.donorCount), byBloodGroup: Object.fromEntries(['A+','A-','B+','B-','O+','O-','AB+','AB-'].map((group) => [group, Number(row[group] || 0)])) } })
  } catch (error) {
    if (error.number === 208) return res.status(503).json({ error: { code: 'SCHEMA_NOT_READY', message: 'The database schema is not installed yet.' } })
    res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The donor summary is temporarily unavailable.' } })
  }
})

app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }))

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } })
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } })
})

module.exports = { app }
