const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendCreated, sendControllerError } = require('../../../core/utils/controllerResponse')

const {
  createRoleService,
  updateRoleService,
  deleteRoleService,
  getAllRolesService,
  getRoleByIdService,
  getRolesByDepartmentService,
  toggleRoleStatusService
} = require('../services/role')

const createRole = asyncHandler(async (req, res) => {
  try {
    const result = await createRoleService(req.body)
    return sendCreated(res, result, 'تم إنشاء الدور بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const updateRole = asyncHandler(async (req, res) => {
  try {
    const result = await updateRoleService(req.body, req.params.id)
    return sendOk(res, result, 'تم تعديل الدور بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const deleteRole = asyncHandler(async (req, res) => {
  try {
    const result = await deleteRoleService(req.params.id)
    return sendOk(res, result, 'تم حذف الدور بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const toggleRoleStatus = asyncHandler(async (req, res) => {
  try {
    const result = await toggleRoleStatusService(req.params.id)
    return sendOk(
      res,
      result,
      result.is_active ? 'تم تفعيل الدور بنجاح' : 'تم تعطيل الدور بنجاح'
    )
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getAllRoles = asyncHandler(async (req, res) => {
  try {
    const result = await getAllRolesService()
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getRoleById = asyncHandler(async (req, res) => {
  try {
    const result = await getRoleByIdService(req.params.id)
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getRolesByDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await getRolesByDepartmentService(req.params.departmentId)
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createRole,
  updateRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRolesByDepartment,
  toggleRoleStatus
}
