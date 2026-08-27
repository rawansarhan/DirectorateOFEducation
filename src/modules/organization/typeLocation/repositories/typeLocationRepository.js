'use strict'

const { TypeLocation } = require('../../../../entities')

async function findAll () {
  return TypeLocation.findAll({
    order: [['id', 'ASC']]
  })
}

async function findById (id) {
  return TypeLocation.findByPk(id)
}

async function findByName (name) {
  return TypeLocation.findOne({ where: { name } })
}

async function create (payload) {
  return TypeLocation.create(payload)
}

module.exports = {
  findAll,
  findById,
  findByName,
  create
}
