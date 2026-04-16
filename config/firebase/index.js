const admin = require('firebase-admin')
const path = require('path')

const serviceAccount = require('./appnet-bf43f-0e1e012de7f5.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

module.exports = admin
