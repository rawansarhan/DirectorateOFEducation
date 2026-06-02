'use strict'

function throwIfAxiosError (err, fallbackMessage = 'External service request failed') {
  if (!err?.response) {
    throw err
  }

  const { status, data } = err.response
  const apiError = new Error(
    data?.message ||
    (typeof data?.error === 'string' ? data.error : null) ||
    fallbackMessage
  )

  apiError.statusCode = status
  apiError.code = data?.code
  apiError.currentVersion = data?.current_version
  apiError.expectedVersion = data?.expected_version
  apiError.lockedBy = data?.locked_by
  apiError.lockedUntil = data?.locked_until

  throw apiError
}

module.exports = {
  throwIfAxiosError
}
