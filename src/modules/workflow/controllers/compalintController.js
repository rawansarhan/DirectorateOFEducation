const asyncHandler = require('../../../core/middleware/asyncHandler')
const {
  getAuthProcessesCompaint
} = require('../services/complaintService')

// =========================================
// GET COMPLAINT PROCESSES
// =========================================
const getComplaintProcesses = asyncHandler(async (req, res) => {
try{
  const userId = req.user.id
  const result = await getAuthProcessesCompaint(userId)

  return res.status(200).json({
    success: true,
    data: result
  })
    } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

module.exports = {
  getComplaintProcesses
}