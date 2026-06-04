'use strict'

const {
  REDIS_URL,
  PROCESS_CACHE_TTL_SECONDS
} = require('../config/env')
const {
  deleteKeysByPattern
} = require('./apiCacheService')

const LOG_PREFIX = '[ProcessCache]'
const PROCESS_LIST_PREFIX = 'process:list:'

async function invalidateAllProcessLists () {
  const count = await deleteKeysByPattern(`${PROCESS_LIST_PREFIX}*`)
  console.log(
    `${LOG_PREFIX} invalidate all process lists (${count} key(s), ttl=${PROCESS_CACHE_TTL_SECONDS}s, redis=${REDIS_URL ? 'on' : 'off'})`
  )
}

module.exports = {
  invalidateAllProcessLists
}
