const dotenv = require('dotenv')
dotenv.config()

const http = require('http')
const app = require('./app')
const sequelize = require('../src/core/config/database')
const { attach: attachNotificationsWs } =
  require('./core/notifications/wsNotificationServer')
const { PORT } = require('./core/config/env')

// 🔥 الأفضل تشغّل الـ jobs بعد ما تتأكد السيرفر شغال أو DB جاهز
require('./core/jobs/processActivationJob');
const registerListeners = require('./core/shared/events/registerListeners')
const { startOutboxWorker } =
  require('./core/shared/outbox/workers/outboxWorker')
const { startServiceTaskSyncJob } =
  require('./core/jobs/serviceTaskSyncJob')

registerListeners()
startOutboxWorker()
startServiceTaskSyncJob()

// نلفّ تطبيق Express داخل خادم HTTP صريح كي نُركّب عليه خادم إشعارات الـ
// WebSocket على نفس المنفذ (لا منفذ ثانٍ، ويعمل خلف Nginx على المسار /ws).
const server = http.createServer(app);
attachNotificationsWs(server);

sequelize.authenticate()
  .then(() => {
    console.log('Database connected');

    server.keepAliveTimeout = 65000
    server.headersTimeout = 66000

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (HTTP + WebSocket /ws)`)
    })
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });