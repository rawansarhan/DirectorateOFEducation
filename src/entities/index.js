'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')

const sequelize =
  require('../core/config/database')

const DataTypes = Sequelize.DataTypes

const db = {}

// =====================================
// LOAD DOMAIN MODELS
// =====================================

fs.readdirSync(__dirname)
  .forEach((folder) => {

    const folderPath =
      path.join(__dirname, folder)

    // skip non-folders
    if (!fs.lstatSync(folderPath).isDirectory()) {
      return
    }

    fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.js') && !file.startsWith('_'))
      .forEach(file => {

        const defineModel =
          require(path.join(folderPath, file))

        const model =
          defineModel(sequelize, DataTypes)

        db[model.name] = model
      })
  })

// =====================================
// OUTBOX MODEL
// =====================================

const OutboxEventModel =
  require('../core/shared/outbox/models/OutboxEvent')

db.OutboxEvent =
  OutboxEventModel(sequelize, DataTypes)

// =====================================
// ASSOCIATIONS
// =====================================

Object.keys(db).forEach(modelName => {

  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db)
  }
})

// =====================================
// EXPORTS
// =====================================

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db