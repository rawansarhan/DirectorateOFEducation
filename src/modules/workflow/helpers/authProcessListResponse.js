'use strict'

/**
 * Unified 200 response for AUTH process list endpoints.
 */
function buildAuthProcessListResponse (result) {
  return {
    message: result.message,
    data: result.data ?? [],
    from_cache: result.from_cache ?? false
  }
}

module.exports = {
  buildAuthProcessListResponse
}
