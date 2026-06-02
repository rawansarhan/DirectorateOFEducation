const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendCreated, sendControllerError } = require('../../../core/utils/controllerResponse')

const {
  createOrganizationService,
  updateOrganizationService,
  deleteOrganizationService,
  getAllOrganizationsService,
  getOrganizationByIdService
} = require('../services/organization')

const createOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await createOrganizationService(req.body)
    return sendCreated(res, result, 'تم إنشاء المؤسسة بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const updateOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await updateOrganizationService(req.body, req.params.id)
    return sendOk(res, result, 'تم تعديل المؤسسة بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const deleteOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await deleteOrganizationService(req.params.id)
    return sendOk(res, result, 'تم حذف المؤسسة بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getAllOrganizations = asyncHandler(async (req, res) => {
  try {
    const result = await getAllOrganizationsService()
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getOrganizationById = asyncHandler(async (req, res) => {
  try {
    const result = await getOrganizationByIdService(req.params.id)
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getAllOrganizations,
  getOrganizationById
}
