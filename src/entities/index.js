'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const sequelize = require('../config/database')

const db = {}

fs.readdirSync(__dirname)
  .filter((file) => file.endsWith('.js') && file !== 'index.js')
  .forEach((file) => {
    const defineModel = require(path.join(__dirname, file))
    const model = defineModel(sequelize, Sequelize.DataTypes)
    db[model.name] = model
  })

Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
