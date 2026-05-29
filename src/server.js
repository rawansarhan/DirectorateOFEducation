const dotenv = require('dotenv');
dotenv.config(); // ✔ لازم أول سطر

const app = require('./app');
const sequelize = require('../src/core/config/database');
const PORT = process.env.PORT || 4000;

// 🔥 الأفضل تشغّل الـ jobs بعد ما تتأكد السيرفر شغال أو DB جاهز
require('./core/jobs/processActivationJob');
const registerListeners = require('./core/shared/events/registerListeners')
const { startOutboxWorker } =
  require('./core/shared/outbox/workers/outboxWorker')

registerListeners()
startOutboxWorker()

sequelize.authenticate()
  .then(() => {
    console.log('Database connected');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });