const asyncHandler = require('../../../core/middleware/asyncHandler')


const {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService
} = require('../services/DocTem')

// =========================================
// CREATE
// =========================================
const createDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const data = {
      ...req.body,
         file_path: req.file
      ? `/uploads/${req.file.filename}`
      : null
    }
    const result = await createDocumentTemplateService(data)
    return res.status(201).json({
      success: true,
      message: 'تم انشاء القالب بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

// =========================================
// UPDATE
// =========================================
const updateDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const data = {
      ...req.body,
      file_path: req.file?.filename
    }
    const Id = req.params.id
    const result = await updateDocumentTemplateService(Id,data)
    return res.status(201).json({
      success: true,
      message: 'تم تعديل القالب بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

// =========================================
// GET ALL ACTIVE
// =========================================
const getAllActiveDocumentTemplates = asyncHandler(async (req, res) => {
  try {
    const result = await getAllActiveDocumentTemplatesService()

    return res.status(200).json(result)
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})
//=========================================
// GET ONE ACTIVE
// =========================================
const getOneActiveDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveDocumentTemplateService(req.params.id)

    return res.status(200).json(result)
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }
})

module.exports = {
  createDocumentTemplate,
  updateDocumentTemplate,
  getAllActiveDocumentTemplates,
  getOneActiveDocumentTemplate
}
