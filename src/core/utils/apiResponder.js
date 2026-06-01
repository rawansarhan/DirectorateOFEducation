const { StatusCodes, getReasonPhrase } = require("http-status-codes");

// عبارة افتراضية ذات معنى لأي status code (getReasonPhrase يرمي خطأً لو الكود غير معروف)
function reasonFor(statusCode) {
  try {
    return getReasonPhrase(statusCode);
  } catch (_) {
    return "";
  }
}

/**
 * موحّد شكل الاستجابة لكل الـ API.
 *
 * شكل النجاح:
 *   { success: true,  status_code, message, data }
 *
 * شكل الخطأ:
 *   { success: false, status_code, message, error, data }
 *   (error = message كنص، حتى يعمل الـ front end الذي يقرأ data['error'] أو data['message'])
 */
class ApiResponder {
  // ============ القلب: نجاح / خطأ ============
  static success(res, { data = null, message = "", statusCode = StatusCodes.OK } = {}) {
    return res.status(statusCode).json({
      success: true,
      status_code: statusCode,
      message: typeof message === "string" ? message : "",
      data,
    });
  }

  static error(
    res,
    { message = "", statusCode = StatusCodes.INTERNAL_SERVER_ERROR, data = null, extra = {} } = {}
  ) {
    const text =
      typeof message === "string" && message.trim()
        ? message
        : reasonFor(statusCode) || "Something went wrong";

    return res.status(statusCode).json({
      success: false,
      status_code: statusCode,
      message: text,
      error: text,
      data,
      ...extra,
    });
  }

  // ============ توافق مع التوقيع القديم (positional) ============
  static successResponse(res, data = null, message = "", statusCode = StatusCodes.OK) {
    return this.success(res, { data, message, statusCode });
  }

  static errorResponse(res, message = "", statusCode = StatusCodes.INTERNAL_SERVER_ERROR, data = null) {
    return this.error(res, { message, statusCode, data });
  }

  // ============ اختصارات النجاح ============
  static okResponse(res, data = null, message = "") {
    return this.success(res, { data, message, statusCode: StatusCodes.OK });
  }

  static createdResponse(res, data = null, message = "") {
    return this.success(res, { data, message, statusCode: StatusCodes.CREATED });
  }

  static noContentResponse(res, message = "") {
    // نُبقيها 200 (وليس 204) لأن الـ front end يعامل 204 كخطأ ولا يقرأ جسماً معها.
    return this.success(res, { data: null, message, statusCode: StatusCodes.OK });
  }

  // ============ اختصارات الخطأ ============
  static badRequestResponse(res, message = "", data = null) {
    return this.error(res, { message, statusCode: StatusCodes.BAD_REQUEST, data });
  }

  static unauthorizedResponse(res, message = "", data = null) {
    return this.error(res, { message, statusCode: StatusCodes.UNAUTHORIZED, data });
  }

  static forbiddenResponse(res, message = "", data = null) {
    return this.error(res, { message, statusCode: StatusCodes.FORBIDDEN, data });
  }

  static notFoundResponse(res, message = "", data = null) {
    return this.error(res, { message, statusCode: StatusCodes.NOT_FOUND, data });
  }

  static conflictResponse(res, message = "", data = null) {
    return this.error(res, { message, statusCode: StatusCodes.CONFLICT, data });
  }

  static unprocessableResponse(res, message = "", data = null) {
    return this.error(res, { message, statusCode: StatusCodes.UNPROCESSABLE_ENTITY, data });
  }

  static tooManyRequestsResponse(res, message = "", data = null, extra = {}) {
    return this.error(res, { message, statusCode: StatusCodes.TOO_MANY_REQUESTS, data, extra });
  }

  static lockedResponse(res, message = "", data = null, extra = {}) {
    return this.error(res, { message, statusCode: StatusCodes.LOCKED, data, extra });
  }
}

module.exports = ApiResponder;
