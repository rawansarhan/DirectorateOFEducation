const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  createTypeLocationService,
  getAllTypeLocationsService
} = require('../services/typeLocation')

// ================= CREATE =================
const createTypeLocation = asyncHandler(async (req, res) => {
  try {
    const result = await createTypeLocationService(req.body)
    return ApiResponder.createdResponse(res, result, 'تم إنشاء نوع الموقع بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET ALL =================
const getAllTypeLocations = asyncHandler(async (req, res) => {
  try {
    const result = await getAllTypeLocationsService()
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

module.exports = {
  createTypeLocation,
  getAllTypeLocations
}
