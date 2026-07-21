'use strict'

/**
 * Public port — auth bounded context.
 * Prefer this for in-process calls. HTTP clients are for remote split only.
 */

module.exports = {
  get getUserRoles () {
    const { getUserRoleIds } =
      require('../shared/services/internal/authClientService')

    return async function getUserRoles (userId) {
      try {
        return await getUserRoleIds(userId)
      } catch (err) {
        if (err.statusCode === 404 || err.response?.status === 404) {
          return []
        }
        throw err
      }
    }
  }
}
