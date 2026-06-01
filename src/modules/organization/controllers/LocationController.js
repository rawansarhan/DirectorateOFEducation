const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')
const { getAllLocationsService } = require('../services/location')

// ================= GET ALL =================
const getAllLocations = asyncHandler(async (req, res) => {
  try {
    const result = await getAllLocationsService()
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

module.exports = {
  getAllLocations
}
