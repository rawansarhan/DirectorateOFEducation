const ApiResponder = require('../utils/apiResponder')
const { HTTP_STATUS } = require('./httpStatusCodes')

const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  if (err.name === 'ValidationError') {
    return ApiResponder.unprocessableResponse(res, err.message)
  }

  if (err.name === 'UnauthorizedError') {
    return ApiResponder.unauthorizedResponse(res, err.message)
  }

  if (err.statusCode === HTTP_STATUS.NOT_FOUND) {
    return ApiResponder.notFoundResponse(res, err.message)
  }

  return ApiResponder.internalErrorResponse(res, 'Something went wrong')
}

module.exports = errorHandler
