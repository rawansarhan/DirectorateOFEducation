const { PORT } = require('./core/config/env')

const app = require('./app')
const sequelize = require('../src/core/config/database')

require('./core/jobs/processActivationJob')
const registerListeners = require('./core/shared/events/registerListeners')
const { startOutboxWorker } =
  require('./core/shared/outbox/workers/outboxWorker')

registerListeners()
startOutboxWorker()

sequelize.authenticate()
  .then(() => {
    console.log('Database connected')

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err)
  })
