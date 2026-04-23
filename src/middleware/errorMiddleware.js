const ApiResponder = require('../utils/ApiResponder');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return ApiResponder.unprocessableResponse(res, err.message);
  }

  if (err.name === 'UnauthorizedError') {
    return ApiResponder.unauthorizedResponse(res, err.message);
  }

  if (err.statusCode === 404) {
    return ApiResponder.notFoundResponse(res, err.message);
  }

  return ApiResponder.errorResponse(res, 'Something went wrong');
};

module.exports = errorHandler;
