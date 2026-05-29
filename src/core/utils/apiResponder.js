const { StatusCodes, ReasonPhrases } = require("http-status-codes");

class ApiResponder {
  static successResponse(res, data = null, message = "", statusCode = StatusCodes.OK) {
    return res.status(statusCode).json({
      status_code: statusCode,
      message: message || ReasonPhrases[statusCode],
      data: data,
    });
  }

  static errorResponse(res, message = "", statusCode = StatusCodes.INTERNAL_SERVER_ERROR, data = null) {
    return res.status(statusCode).json({
      status_code: statusCode,
      message: { errors: message || ReasonPhrases[statusCode] },
      data: data,
    });
  }

  static okResponse(res, data = null, message = "") {
    return this.successResponse(res, data, message, StatusCodes.OK);
  }

  static createdResponse(res, data = null, message = "") {
    return this.successResponse(res, data, message, StatusCodes.CREATED);
  }

  static noContentResponse(res, message = "") {
    return this.successResponse(res, null, message, StatusCodes.NO_CONTENT);
  }

  static badRequestResponse(res, message = "") {
    return this.errorResponse(res, message, StatusCodes.BAD_REQUEST);
  }

  static unauthorizedResponse(res, message = "", data = null) {
    return this.errorResponse(res, message, StatusCodes.UNAUTHORIZED, data);
  }

  static forbiddenResponse(res, message = "") {
    return this.errorResponse(res, message, StatusCodes.FORBIDDEN);
  }

  static notFoundResponse(res, message = "") {
    return this.errorResponse(res, message, StatusCodes.NOT_FOUND);
  }

  static conflictResponse(res, message = "") {
    return this.errorResponse(res, message, StatusCodes.CONFLICT);
  }

  static unprocessableResponse(res, message = "") {
    return this.errorResponse(res, message, StatusCodes.UNPROCESSABLE_ENTITY);
  }
}

module.exports = ApiResponder;