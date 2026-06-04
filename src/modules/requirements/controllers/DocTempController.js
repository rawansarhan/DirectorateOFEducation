const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')


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
    return ApiResponder.createdResponse(res, result, 'تم انشاء القالب بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
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
    return ApiResponder.createdResponse(res, result, 'تم تعديل القالب بنجاح')
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

// =========================================
// GET ALL ACTIVE
// =========================================
const getAllActiveDocumentTemplates = asyncHandler(async (req, res) => {
  try {
    const result = await getAllActiveDocumentTemplatesService()

    return ApiResponder.okResponse(res, result)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})
//=========================================
// GET ONE ACTIVE
// =========================================
const getOneActiveDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveDocumentTemplateService(req.params.id)

    return ApiResponder.okResponse(res, result)
  } catch (err) {
    return ApiResponder.badRequestResponse(res, err.message)
  }
})

module.exports = {
  createDocumentTemplate,
  updateDocumentTemplate,
  getAllActiveDocumentTemplates,
  getOneActiveDocumentTemplate
}
