'use strict'

const { Permission } = require('../../../../entities')
const { Op } = require('sequelize')

async function findAllPermissions () {
  return Permission.findAll({
    attributes: ['id', 'name', 'code', 'type', 'created_at', 'updated_at'],
    order: [
      ['type', 'ASC'],
      ['id', 'ASC']
    ]
  })
}

async function findByTypes (types = []) {
  const uniqueTypes = [...new Set((types || []).filter(Boolean))]

  if (!uniqueTypes.length) {
    return []
  }

  return Permission.findAll({
    where: {
      type: { [Op.in]: uniqueTypes }
    },
    attributes: ['id', 'name', 'code', 'type', 'created_at', 'updated_at'],
    order: [
      ['type', 'ASC'],
      ['id', 'ASC']
    ]
  })
}

async function findByIds (ids = []) {
  if (!ids.length) {
    return []
  }

  return Permission.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'name', 'code', 'type']
  })
}

async function findById (id) {
  return Permission.findByPk(id, {
    attributes: ['id', 'name', 'code', 'type', 'created_at', 'updated_at']
  })
}

module.exports = {
  findAllPermissions,
  findByTypes,
  findByIds,
  findById
}
