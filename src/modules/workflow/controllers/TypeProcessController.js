const asyncHandler = require('../../../core/middleware/asyncHandler')


const {
  createTypeProcessService,
  updateTypeProcessService,
  getAllTypeProcessesService
} = require('../services/typeProcess')

// ================= CREATE =================
const createTypeProcess = asyncHandler(async (req, res) => {
  try {
    const result = await createTypeProcessService(req.body)

    return res.status(201).json({
      success: true,
      message: 'تم انشاء نوع العملية بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

// ================= UPDATE =================
const updateTypeProcess = asyncHandler(async (req, res) => {
  try {
    const result = await updateTypeProcessService(req.body, req.params.id)

    return res.status(200).json({
      success: true,
      message: 'تم تعديل نوع العملية بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

// ================= GET ALL =================
const getAlltype = asyncHandler(async (req, res) => {
  try {
    const result = await getAllTypeProcessesService()

    return res.status(200).json({
      success: true,
      message: 'تم جلب البيانات بنجاح',
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
  createTypeProcess,
  updateTypeProcess,
  getAlltype
}
