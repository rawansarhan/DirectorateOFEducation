const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendControllerError } = require('../../../core/utils/controllerResponse')
const { getAllLocationsService } = require('../services/location')

const getAllLocations = asyncHandler(async (req, res) => {
  try {
    const result = await getAllLocationsService()
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  getAllLocations
}
