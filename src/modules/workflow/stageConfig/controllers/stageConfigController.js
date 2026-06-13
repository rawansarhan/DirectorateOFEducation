'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createStageConfigService,
  getConfig_json
} = require('../services/stageConfigService')
const {
  HTTP_STATUS,
  resolveHttpStatusFromError
} = require('../../../../core/middleware/httpStatusCodes')

function resolveStageConfigErrorCode (err, statusCode) {
  if (err?.code) {
    return err.code
  }

  if (statusCode === HTTP_STATUS.NOT_FOUND) {
    return 'NOT_FOUND'
  }

  if (statusCode === HTTP_STATUS.UNAUTHORIZED) {
    return 'UNAUTHORIZED'
  }

  if (statusCode === HTTP_STATUS.FORBIDDEN) {
    return 'FORBIDDEN'
  }

  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    return 'INTERNAL_ERROR'
  }

  return 'REQUEST_ERROR'
}

function handleStageConfigError (res, err, fallbackMessage) {
  const statusCode = resolveHttpStatusFromError(err, HTTP_STATUS.BAD_REQUEST)
  const message =
    (typeof err?.message === 'string' && err.message.trim())
      ? err.message
      : fallbackMessage

  return ApiResponder.error(res, {
    message,
    statusCode,
    error: resolveStageConfigErrorCode(err, statusCode),
    data: null
  })
}

const createStageConfig = asyncHandler(async (req, res) => {
  try {
    const result = await createStageConfigService(req.body)
    return ApiResponder.okResponse(res, result, 'تم إعداد المراحل بنجاح !')
  } catch (err) {
    return handleStageConfigError(res, err, 'تعذّر إعداد المراحل')
  }
})

const getJsonProcess = asyncHandler(async (req, res) => {
  try {
    const result = await getConfig_json(req.params.id, {
      userId: req.user.id
    })
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return handleStageConfigError(res, err, 'تعذّر جلب استمارة التقديم')
  }
})

module.exports = {
  createStageConfig,
  getJsonProcess
}
