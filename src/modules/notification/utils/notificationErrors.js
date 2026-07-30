'use strict'

const { HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')

const MESSAGES = {
  LIST_RETRIEVED: 'تم جلب الإشعارات بنجاح',
  MARKED_READ: 'تم تعليم الإشعار كمقروء بنجاح',
  MARKED_READ_BULK: 'تم تعليم الإشعارات كمقروءة بنجاح',
  NOT_FOUND: 'الإشعار غير موجود أو لا يخص حسابك',
  INVALID_NOTIFICATION_ID: 'معرّف الإشعار غير صالح — يجب أن يكون رقماً صحيحاً أكبر من 0',
  INVALID_NOTIFICATION_IDS: 'notification_ids يجب أن تكون مصفوفة أرقام صحيحة موجبة (1–100 عنصر)',
  INVALID_UNREAD: 'قيمة unread غير صالحة — استخدم true أو false فقط',
  INVALID_PAGE: 'رقم الصفحة (page) غير صالح — يجب أن يكون رقماً صحيحاً أكبر من أو يساوي 1',
  INVALID_LIMIT: 'قيمة limit غير صالحة — يجب أن تكون رقماً بين 1 و 100',
  UNAUTHORIZED: 'يجب تسجيل الدخول لعرض الإشعارات',
  INTERNAL_ERROR: 'تعذّر معالجة طلب الإشعارات حالياً، يرجى المحاولة لاحقاً'
}

const ERROR_BY_CODE = {
  VALIDATION_ERROR: {
    message: MESSAGES.INVALID_NOTIFICATION_ID,
    status: HTTP_STATUS.BAD_REQUEST
  },
  NOTIFICATION_NOT_FOUND: {
    message: MESSAGES.NOT_FOUND,
    status: HTTP_STATUS.NOT_FOUND
  },
  NOT_FOUND: {
    message: MESSAGES.NOT_FOUND,
    status: HTTP_STATUS.NOT_FOUND
  },
  UNAUTHORIZED: {
    message: MESSAGES.UNAUTHORIZED,
    status: HTTP_STATUS.UNAUTHORIZED
  },
  NO_TOKEN: {
    message: 'لم يتم إرسال رمز الدخول — أضف Authorization: Bearer {token}',
    status: HTTP_STATUS.UNAUTHORIZED
  },
  TOKEN_EXPIRED: {
    message: 'انتهت صلاحية جلسة الدخول — سجّل الدخول من جديد',
    status: HTTP_STATUS.UNAUTHORIZED
  },
  INVALID_TOKEN: {
    message: 'رمز الدخول غير صالح — سجّل الدخول من جديد',
    status: HTTP_STATUS.UNAUTHORIZED
  },
  NO_ROLES: {
    message: 'حسابك لا يملك صلاحيات كافية لعرض الإشعارات',
    status: HTTP_STATUS.FORBIDDEN
  },
  FORBIDDEN: {
    message: 'لا تملك صلاحية تنفيذ هذا الإجراء',
    status: HTTP_STATUS.FORBIDDEN
  },
  INTERNAL_ERROR: {
    message: MESSAGES.INTERNAL_ERROR,
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR
  }
}

const ERROR_BY_MESSAGE = {
  [MESSAGES.NOT_FOUND]: ERROR_BY_CODE.NOTIFICATION_NOT_FOUND,
  'الإشعار غير موجود': ERROR_BY_CODE.NOTIFICATION_NOT_FOUND,
  'notificationId غير صالح': {
    message: MESSAGES.INVALID_NOTIFICATION_ID,
    code: 'VALIDATION_ERROR',
    status: HTTP_STATUS.BAD_REQUEST
  },
  'unread يجب أن يكون true أو false': {
    message: MESSAGES.INVALID_UNREAD,
    code: 'VALIDATION_ERROR',
    status: HTTP_STATUS.BAD_REQUEST
  }
}

function mapPaginationErrorMessage (message = '') {
  if (message.includes('page يجب')) {
    return MESSAGES.INVALID_PAGE
  }

  if (message.includes('limit يجب')) {
    return MESSAGES.INVALID_LIMIT
  }

  return null
}

function resolveNotificationError (error) {
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'VALIDATION_ERROR',
      status: HTTP_STATUS.BAD_REQUEST
    }
  }

  const paginationMessage = mapPaginationErrorMessage(error?.message)
  if (paginationMessage) {
    return {
      message: paginationMessage,
      code: 'VALIDATION_ERROR',
      status: HTTP_STATUS.BAD_REQUEST
    }
  }

  const byMessage = ERROR_BY_MESSAGE[error?.message]
  if (byMessage) {
    return {
      message: byMessage.message,
      code: error.code || byMessage.code || 'REQUEST_ERROR',
      status: byMessage.status
    }
  }

  const byCode = ERROR_BY_CODE[error?.code]
  if (byCode) {
    return {
      message: byCode.message,
      code: error.code,
      status: byCode.status
    }
  }

  if (error?.statusCode === HTTP_STATUS.UNAUTHORIZED) {
    return {
      message: MESSAGES.UNAUTHORIZED,
      code: 'UNAUTHORIZED',
      status: HTTP_STATUS.UNAUTHORIZED
    }
  }

  if (error?.statusCode === HTTP_STATUS.FORBIDDEN) {
    return ERROR_BY_CODE.FORBIDDEN
  }

  if (error?.statusCode === HTTP_STATUS.NOT_FOUND) {
    return ERROR_BY_CODE.NOTIFICATION_NOT_FOUND
  }

  if (error?.statusCode === HTTP_STATUS.BAD_REQUEST || error?.code === 'VALIDATION_ERROR') {
    return {
      message: error.message || MESSAGES.INVALID_NOTIFICATION_ID,
      code: 'VALIDATION_ERROR',
      status: HTTP_STATUS.BAD_REQUEST
    }
  }

  return {
    message: error?.message || MESSAGES.INTERNAL_ERROR,
    code: error?.code || 'INTERNAL_ERROR',
    status: error?.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
  }
}

module.exports = {
  MESSAGES,
  resolveNotificationError
}
