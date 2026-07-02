'use strict'

const {
  REDIS_URL,
  PROCESS_CACHE_TTL_SECONDS
} = require('../config/env')
const {
  invalidateAllAuthProcessCaches
} = require('./apiCacheService')

const LOG_PREFIX = '[ProcessCache]'

async function invalidateAllProcessLists () {
  await invalidateAllAuthProcessCaches()
  console.log(
    `${LOG_PREFIX} invalidate all process lists (ttl=${PROCESS_CACHE_TTL_SECONDS}s, redis=${REDIS_URL ? 'on' : 'off'})`
  )
}

module.exports = {
  invalidateAllProcessLists
}
