const asyncHandler = require('../../../core/middleware/asyncHandler')
const { getAllLocationsService } = require('../services/location')

// ================= GET ALL =================
const getAllLocations = asyncHandler(async (req, res) => {
  try {
    const result = await getAllLocationsService()
    return res.status(200).json({
      success: true,
      message: 'تم جلب البيانات بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
})

module.exports = {
  getAllLocations
}
