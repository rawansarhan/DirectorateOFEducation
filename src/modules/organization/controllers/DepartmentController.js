const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')

const {
  createDepartmentService,
  updateDepartmentService,
  deleteDepartmentService,
  getAllDepartmentsService,
  getDepartmentByIdService,
  getDepartmentOverviewService,
  getLeafDepartmentsByOrganizationService,
  toggleDepartmentStatusService
} = require('../services/department')

// ================= CREATE =================
const createDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await createDepartmentService(req.body)
    return ApiResponder.createdResponse(res, result, 'تم إنشاء القسم بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= UPDATE =================
const updateDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await updateDepartmentService(req.body, req.params.id)
    return ApiResponder.okResponse(res, result, 'تم تعديل القسم بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= DELETE =================
const deleteDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await deleteDepartmentService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم حذف القسم بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET ALL =================
const getAllDepartments = asyncHandler(async (req, res) => {
  try {
    const result = await getAllDepartmentsService()
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET BY ID =================
const getDepartmentById = asyncHandler(async (req, res) => {
  try {
    const result = await getDepartmentByIdService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= TOGGLE STATUS =================
const toggleDepartmentStatus = asyncHandler(async (req, res) => {
  try {
    const result = await toggleDepartmentStatusService(req.params.id)
    return ApiResponder.okResponse(
      res,
      result,
      result.is_active
        ? 'تم تفعيل القسم بنجاح'
        : 'تم تعطيل القسم بنجاح'
    )
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET OVERVIEW =================
const getDepartmentOverview = asyncHandler(async (req, res) => {
  try {
    const result = await getDepartmentOverviewService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET LEAVES BY ORGANIZATION =================
const getLeafDepartmentsByOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await getLeafDepartmentsByOrganizationService(
      req.params.organizationId
    )
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

module.exports = {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllDepartments,
  getDepartmentById,
  getDepartmentOverview,
  getLeafDepartmentsByOrganization,
  toggleDepartmentStatus
}
