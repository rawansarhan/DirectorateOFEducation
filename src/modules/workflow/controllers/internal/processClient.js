'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const { sendOk, sendControllerError } = require('../../../../core/utils/controllerResponse')
const { HTTP_STATUS } = require('../../../../core/middleware/httpStatusCodes')
const { getProcessByIdService } = require('../../services/internal/processClient')

const processById = asyncHandler(async (req, res) => {
  try {
    const result = await getProcessByIdService(req.params.id)
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err, HTTP_STATUS.NOT_FOUND)
  }
})

module.exports = {
  processById
}
