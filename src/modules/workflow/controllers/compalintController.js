const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendControllerError } = require('../../../core/utils/controllerResponse')
const {
  getAuthProcessesCompaint,
  getCitizenComplaintProcesses
} = require('../services/complaintService')
const { buildAuthProcessListResponse } = require('../helpers/authProcessListResponse')

const LOG_PREFIX = '[ComplaintController]'

const getComplaintProcesses = asyncHandler(async (req, res) => {
  try {
    const result = await getAuthProcessesCompaint(req.user.id)
    return sendOk(
      res,
      buildAuthProcessListResponse(result),
      result.message || 'تم جلب عمليات الشكاوى بنجاح'
    )
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getCitizenComplaintProcessesHandler = asyncHandler(async (req, res) => {
  try {
    console.log(`${LOG_PREFIX} GET /citizen/complaints`)
    const result = await getCitizenComplaintProcesses()
    return sendOk(
      res,
      buildAuthProcessListResponse(result),
      result.message || 'تم جلب عمليات الشكاوى بنجاح'
    )
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  getComplaintProcesses,
  getCitizenComplaintProcessesHandler
}
