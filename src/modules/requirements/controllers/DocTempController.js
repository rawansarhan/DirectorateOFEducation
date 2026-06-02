const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendCreated, sendControllerError } = require('../../../core/utils/controllerResponse')

const {
  createDocumentTemplateService,
  updateDocumentTemplateService,
  getAllActiveDocumentTemplatesService,
  getOneActiveDocumentTemplateService
} = require('../services/DocTem')

const createDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const data = {
      ...req.body,
      file_path: req.file
        ? `/uploads/${req.file.filename}`
        : null
    }
    const result = await createDocumentTemplateService(data)
    return sendCreated(res, result, 'تم انشاء القالب بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const updateDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const data = {
      ...req.body,
      file_path: req.file?.filename
    }
    const result = await updateDocumentTemplateService(req.params.id, data)
    return sendOk(res, result, 'تم تعديل القالب بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getAllActiveDocumentTemplates = asyncHandler(async (req, res) => {
  try {
    const result = await getAllActiveDocumentTemplatesService()
    return sendOk(res, result, 'تم جلب القوالب بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getOneActiveDocumentTemplate = asyncHandler(async (req, res) => {
  try {
    const result = await getOneActiveDocumentTemplateService(req.params.id)
    return sendOk(res, result, 'تم جلب القالب بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createDocumentTemplate,
  updateDocumentTemplate,
  getAllActiveDocumentTemplates,
  getOneActiveDocumentTemplate
}
