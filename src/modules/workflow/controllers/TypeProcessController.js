const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')


const {
  createTypeProcessService,
  updateTypeProcessService,
  getAllTypeProcessesService
} = require('../services/typeProcess')

// ================= CREATE =================
const createTypeProcess = asyncHandler(async (req, res) => {
  try {
    const result = await createTypeProcessService(req.body)

    return ApiResponder.createdResponse(res, result, 'تم انشاء نوع العملية بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

// ================= UPDATE =================
const updateTypeProcess = asyncHandler(async (req, res) => {
  try {
    const result = await updateTypeProcessService(req.body, req.params.id)

    return ApiResponder.okResponse(res, result, 'تم تعديل نوع العملية بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

// ================= GET ALL =================
const getAlltype = asyncHandler(async (req, res) => {
  try {
    const result = await getAllTypeProcessesService()

    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createTypeProcess,
  updateTypeProcess,
  getAlltype
}
