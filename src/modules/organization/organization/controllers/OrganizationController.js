const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')


const {
  createOrganizationService,
  updateOrganizationService,
  deleteOrganizationService,
  getAllOrganizationsService,
  getOrganizationByIdService
} = require('../services/organization')

// ================= CREATE =================
const createOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await createOrganizationService(req.body)
    return ApiResponder.createdResponse(res, result, 'تم إنشاء المؤسسة بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= UPDATE =================
const updateOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await updateOrganizationService(req.body, req.params.id)
    return ApiResponder.okResponse(res, result, 'تم تعديل المؤسسة بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= DELETE =================
const deleteOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await deleteOrganizationService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم حذف المؤسسة بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET ALL =================
const getAllOrganizations = asyncHandler(async (req, res) => {
  try {
    const result = await getAllOrganizationsService()
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET BY ID =================
const getOrganizationById = asyncHandler(async (req, res) => {
  try {
    const result = await getOrganizationByIdService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

module.exports = {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getAllOrganizations,
  getOrganizationById
}
