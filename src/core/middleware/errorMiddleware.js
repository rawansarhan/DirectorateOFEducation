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
const exceptionLogger = require('../logging/exceptionLogger');
const { getClientIp } = require('../security/securityConfig');

function shouldLogException (err, statusCode) {
  if (!err) {
    return false;
  }

  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    return true;
  }

  if (err.name === 'ValidationError' || err.name === 'UnauthorizedError') {
    return false;
  }

  if (err.statusCode === HTTP_STATUS.NOT_FOUND) {
    return false;
  }

  return false;
}

function logUnexpected (err, req, statusCode) {
  exceptionLogger.error({
    message: err?.message || 'unexpected_error',
    err,
    user_id: req.user?.id || null,
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode,
    ip: getClientIp(req)
  });
}

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

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

    if (shouldLogException(err, statusCode)) {
      logUnexpected(err, req, statusCode);
    }

    return ApiResponder.errorResponse(
      res,
      clientMessage,
      statusCode,
      payload.code,
      payload.details ? { errors: payload.details } : null
    );
  }

  logUnexpected(err, req, HTTP_STATUS.INTERNAL_SERVER_ERROR);

  return ApiResponder.internalErrorResponse(
    res,
    'حدث خطأ داخلي غير متوقع',
    'INTERNAL_ERROR'
  );
};

module.exports = errorHandler;
