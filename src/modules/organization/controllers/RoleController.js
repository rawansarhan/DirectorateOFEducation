const asyncHandler = require('../../../core/middleware/asyncHandler')
const {
  createRoleService,
  updateRoleService,
  deleteRoleService,
  getAllRolesService,
  getRoleByIdService,
  getRolesByDepartmentService
} = require('../services/role')

// ================= CREATE =================
const createRole = asyncHandler(async (req, res) => {
  try {
    const result = await createRoleService(req.body)
    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الدور بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
})

// ================= UPDATE =================
const updateRole = asyncHandler(async (req, res) => {
  try {
    const result = await updateRoleService(req.body, req.params.id)
    return res.status(200).json({
      success: true,
      message: 'تم تعديل الدور بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
})

// ================= DELETE =================
const deleteRole = asyncHandler(async (req, res) => {
  try {
    const result = await deleteRoleService(req.params.id)
    return res.status(200).json({
      success: true,
      message: 'تم حذف الدور بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
})

// ================= GET ALL =================
const getAllRoles = asyncHandler(async (req, res) => {
  try {
    const result = await getAllRolesService()
    return res.status(200).json({
      success: true,
      message: 'تم جلب البيانات بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
})

// ================= GET BY ID =================
const getRoleById = asyncHandler(async (req, res) => {
  try {
    const result = await getRoleByIdService(req.params.id)
    return res.status(200).json({
      success: true,
      message: 'تم جلب البيانات بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
})

// ================= GET ROLES BY DEPARTMENT =================
const getRolesByDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await getRolesByDepartmentService(req.params.departmentId)
    return res.status(200).json({
      success: true,
      message: 'تم جلب البيانات بنجاح',
      data: result
    })
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message
    })
  }
})

module.exports = {
  createRole,
  updateRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRolesByDepartment
}
