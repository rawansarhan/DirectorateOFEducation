const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const { buildAuditContext } = require('../../../../core/security/auditContext')
const {
  createRoleService,
  updateRoleService,
  deleteRoleService,
  getAllRolesService,
  getRoleCatalogService,
  getRoleByIdService,
  getRolesByDepartmentService,
  toggleRoleStatusService
} = require('../services/role')

// ================= CREATE =================
const createRole = asyncHandler(async (req, res) => {
  try {
    const result = await createRoleService(req.body, buildAuditContext(req))
    return ApiResponder.createdResponse(res, result, 'تم إنشاء الدور بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= UPDATE =================
const updateRole = asyncHandler(async (req, res) => {
  try {
    const result = await updateRoleService(req.body, req.params.id)
    return ApiResponder.okResponse(res, result, 'تم تعديل الدور بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= DELETE =================
const deleteRole = asyncHandler(async (req, res) => {
  try {
    const result = await deleteRoleService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم حذف الدور بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= TOGGLE STATUS =================
const toggleRoleStatus = asyncHandler(async (req, res) => {
  try {
    const result = await toggleRoleStatusService(req.params.id, buildAuditContext(req))
    return ApiResponder.okResponse(
      res,
      result,
      result.is_active
        ? 'تم تفعيل الدور بنجاح'
        : 'تم تعطيل الدور بنجاح'
    )
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET ALL =================
const getAllRoles = asyncHandler(async (req, res) => {
  try {
    const result = await getAllRolesService(req.query.organization_id)
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET ROLE CATALOG =================
const getRoleCatalog = asyncHandler(async (req, res) => {
  try {
    const result = await getRoleCatalogService()
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET BY ID =================
const getRoleById = asyncHandler(async (req, res) => {
  try {
    const result = await getRoleByIdService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET ROLES BY DEPARTMENT =================
const getRolesByDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await getRolesByDepartmentService(req.params.departmentId)
    return ApiResponder.okResponse(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

module.exports = {
  createRole,
  updateRole,
  deleteRole,
  getAllRoles,
  getRoleCatalog,
  getRoleById,
  getRolesByDepartment,
  toggleRoleStatus
}
