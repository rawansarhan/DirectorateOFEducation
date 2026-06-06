const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  getAuthProcessesCompaint
} = require('../services/complaintService')

// =========================================
// GET COMPLAINT PROCESSES
// =========================================
const getComplaintProcesses = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id
    const result = await getAuthProcessesCompaint(userId)

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  getComplaintProcesses
}