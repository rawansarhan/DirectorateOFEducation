'use strict'

const { Permission } = require('../../../../entities')

async function findAllPermissions () {
  return Permission.findAll({
    attributes: ['id', 'name', 'display_name', 'created_at', 'updated_at'],
    order: [['id', 'ASC']]
  })
}

async function findByIds (ids = []) {
  if (!ids.length) {
    return []
  }

  return Permission.findAll({
    where: { id: ids },
    attributes: ['id', 'name', 'display_name']
  })
}

async function findById (id) {
  return Permission.findByPk(id, {
    attributes: ['id', 'name', 'display_name', 'created_at', 'updated_at']
  })
}

module.exports = {
  findAllPermissions,
  findByIds,
  findById
}
