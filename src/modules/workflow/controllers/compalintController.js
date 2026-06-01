const asyncHandler = require('../../../core/middleware/asyncHandler')
const {
  getAuthProcessesCompaint,
  getCitizenComplaintProcesses
} = require('../services/complaintService')
const {
  buildAuthProcessListResponse
} = require('../helpers/authProcessListResponse')

const LOG_PREFIX = '[ComplaintController]'

const getComplaintProcesses = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id
    const result = await getAuthProcessesCompaint(userId)

    return res.status(200).json(buildAuthProcessListResponse(result))
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

const getCitizenComplaintProcessesHandler = asyncHandler(async (req, res) => {
  try {
    console.log(`${LOG_PREFIX} GET /citizen/complaints`)
    const result = await getCitizenComplaintProcesses()

    return res.status(200).json(buildAuthProcessListResponse(result))
  } catch (err) {    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

module.exports = {
  getComplaintProcesses,
  getCitizenComplaintProcessesHandler
}
