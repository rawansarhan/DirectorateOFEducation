'use strict'

const path = require('path')
const fs = require('fs')

let firebaseAdmin = null

function getFirebaseAdmin () {
  if (firebaseAdmin) {
    return firebaseAdmin
  }

  const serviceAccountPath = path.join(
    __dirname,
    'appnet-bf43f-0e1e012de7f5.json'
  )

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      'Firebase service account file not found. Place appnet-bf43f-0e1e012de7f5.json in config/firebase/'
    )
  }

  const admin = require('firebase-admin')
  const serviceAccount = require(serviceAccountPath)

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
  }

  firebaseAdmin = admin
  return firebaseAdmin
}

module.exports = {
  getFirebaseAdmin
}
