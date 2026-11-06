const { app } = require('./app')
const { port } = require('./config')

app.listen(port, () => process.stdout.write(`HemoTrack API listening on port ${port}\n`))
