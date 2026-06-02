const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendCreated, sendControllerError } = require('../../../core/utils/controllerResponse')

const {
  createTypeProcessService,
  updateTypeProcessService,
  getAllTypeProcessesService
} = require('../services/typeProcess')

const createTypeProcess = asyncHandler(async (req, res) => {
  try {
    const result = await createTypeProcessService(req.body)
    return sendCreated(res, result, 'تم انشاء نوع العملية بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const updateTypeProcess = asyncHandler(async (req, res) => {
  try {
    const result = await updateTypeProcessService(req.body, req.params.id)
    return sendOk(res, result, 'تم تعديل نوع العملية بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getAlltype = asyncHandler(async (req, res) => {
  try {
    const result = await getAllTypeProcessesService()
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createTypeProcess,
  updateTypeProcess,
  getAlltype
}
