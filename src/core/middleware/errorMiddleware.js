'use strict';

const ApiResponder = require('../utils/apiResponder');
const {
  HTTP_STATUS,
  resolveHttpStatusFromError
} = require('./httpStatusCodes');

function formatSequelizeError(err) {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return 'سجل مكرر — قد تكون إعدادات هذه المرحلة موجودة مسبقاً';
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return 'مرجع غير صالح (مرحلة أو عملية غير موجودة)';
  }

  const parentMsg = err.parent?.message || err.message || '';

  if (parentMsg.includes('stage_configs')) {
    return 'فشل حفظ إعدادات المرحلة في قاعدة البيانات';
  }

  return parentMsg || 'خطأ في قاعدة البيانات';
}

function formatClientErrorMessage(err) {
  if (err?.expose && err.message) {
    return err.message;
  }

  if (
    err?.statusCode &&
    err.statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR &&
    err.message
  ) {
    return err.message;
  }

  if (err?.code === 'VALIDATION_ERROR' && err.message) {
    return err.message;
  }

  if (err.name === 'SequelizeValidationError' && err.errors?.length) {
    return err.errors.map(e => e.message).join(' — ');
  }

  if (
    err.name === 'SequelizeUniqueConstraintError' ||
    err.name === 'SequelizeForeignKeyConstraintError' ||
    err.name === 'SequelizeDatabaseError'
  ) {
    return formatSequelizeError(err);
  }

  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return 'صيغة JSON في الطلب غير صحيحة — تحقق من الأقواس والفواصل وعدم وجود فواصل زائدة';
  }

  if (err.isAxiosError) {
    const remote =
      err.response?.data?.message ||
      err.response?.data?.error;

    if (remote) {
      return `خدمة خارجية: ${remote}`;
    }

    if (err.code === 'ECONNREFUSED') {
      return 'تعذّر الاتصال بخدمة خارجية (المؤسسة/الموارد)';
    }

    return err.message || 'تعذّر الاتصال بخدمة خارجية';
  }

  return err?.message || null;
}

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

    return ApiResponder.errorResponse(
      res,
      clientMessage,
      statusCode,
      err.code || err.name || 'REQUEST_ERROR'
    );
  }

  return ApiResponder.internalErrorResponse(
    res,
    'حدث خطأ داخلي غير متوقع',
    'INTERNAL_ERROR'
  );
};

module.exports = errorHandler;