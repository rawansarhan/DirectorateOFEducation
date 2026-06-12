'use strict';

const ApiResponder = require('../utils/apiResponder');
const {
  HTTP_STATUS,
  resolveHttpStatusFromError
} = require('./httpStatusCodes');
const {
  formatClientErrorMessage,
  buildErrorPayload
} = require('../utils/errorMessageHelper');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error('[error]', err.stack || err);

  if (err.name === 'ValidationError') {
    return ApiResponder.unprocessableResponse(
      res,
      err.message,
      err.name
    );
  }

  if (err.name === 'UnauthorizedError') {
    return ApiResponder.unauthorizedResponse(
      res,
      err.message
    );
  }

  if (err.statusCode === 404) {
    return ApiResponder.notFoundResponse(
      res,
      err.message
    );
  }

  const clientMessage = formatClientErrorMessage(err);

  if (clientMessage) {
    const statusCode = resolveHttpStatusFromError(
      err,
      HTTP_STATUS.BAD_REQUEST
    );
    const payload = buildErrorPayload(err);

    return ApiResponder.errorResponse(
      res,
      clientMessage,
      statusCode,
      payload.code,
      payload.details ? { errors: payload.details } : null
    );
  }

  return ApiResponder.internalErrorResponse(
    res,
    'حدث خطأ داخلي غير متوقع',
    'INTERNAL_ERROR'
  );
};

module.exports = errorHandler;