const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const { parsePaginationQuery } = require('../../../../core/utils/pagination')
const {
  getAuthProcessesCompaint
} = require('../services/complaintService')

// =========================================
// GET COMPLAINT PROCESSES
// =========================================
const getComplaintProcesses = asyncHandler(async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginationQuery(req.query)
    const userId = req.user.id
    const result = await getAuthProcessesCompaint(userId, { page, limit, offset })

    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  getComplaintProcesses
}