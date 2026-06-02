'use strict'

function buildAuthProcessListResponse (result) {
  return {
    items: result.data ?? [],
    from_cache: result.from_cache ?? false
  }
}

module.exports = {
  buildAuthProcessListResponse
}
