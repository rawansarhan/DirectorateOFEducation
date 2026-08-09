'use strict'

/**
 * Escape LIKE wildcards for safe prefix/contains search.
 * Use with Sequelize Op.iLike / Op.like and ESCAPE '\\' (Postgres default).
 */
function escapeLike (value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

function likeContains (value) {
  const { Op } = require('sequelize')
  return { [Op.iLike]: `%${escapeLike(value)}%` }
}

module.exports = {
  escapeLike,
  likeContains
}
