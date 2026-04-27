const asyncHandler = require('../middleware/asyncHandler')

const {
  createTypeProcessService,
  updateTypeProcessService,
  getAllTypeProcessesService
} = require('../services/typeProcess')

// ================= CREATE =================
const createTypeProcess = asyncHandler(async (req, res) => {
  const result = await createTypeProcessService(req.body)

  return res.status(201).json({
    success: true,
    message: 'تم انشاء نوع العملية بنجاح',
    data: result
  })
})

// ================= UPDATE =================
const updateTypeProcess = asyncHandler(async (req, res) => {
  const result = await updateTypeProcessService(req.body, req.params.id)

  return res.status(200).json({
    success: true,
    message: 'تم تعديل نوع العملية بنجاح',
    data: result
  })
})

// ================= GET ALL =================
const getAlltype = asyncHandler(async (req, res) => {
  const result = await getAllTypeProcessesService()

  return res.status(200).json({
    success: true,
    message: 'تم جلب البيانات بنجاح',
    data: result
  })
})

module.exports = {
  createTypeProcess,
  updateTypeProcess,
  getAlltype
}