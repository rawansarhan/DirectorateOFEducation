'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const { listAuditLogs } = require('../services/auditLogService')

const listAuditLogsController = asyncHandler(async (req, res) => {
  try {
    const result = await listAuditLogs(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب سجلات التدقيق بنجاح')
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || null
    })
  }
})

module.exports = {
  listAuditLogsController
}
