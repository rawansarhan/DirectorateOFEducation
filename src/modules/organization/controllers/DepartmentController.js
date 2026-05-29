const asyncHandler = require('../../../core/middleware/asyncHandler')

const {
  createDepartmentService,
  updateDepartmentService,
  deleteDepartmentService,
  getAllDepartmentsService,
  getDepartmentByIdService,
  getLeafDepartmentsByOrganizationService
} = require('../services/department')

// ================= CREATE =================
const createDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await createDepartmentService(req.body)
    return res.status(201).json({
      success: true,
      message: 'تم إنشاء القسم بنجاح',
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
const updateDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await updateDepartmentService(req.body, req.params.id)
    return res.status(200).json({
      success: true,
      message: 'تم تعديل القسم بنجاح',
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
const deleteDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await deleteDepartmentService(req.params.id)
    return res.status(200).json({
      success: true,
      message: 'تم حذف القسم بنجاح',
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
const getAllDepartments = asyncHandler(async (req, res) => {
  try {
    const result = await getAllDepartmentsService()
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
const getDepartmentById = asyncHandler(async (req, res) => {
  try {
    const result = await getDepartmentByIdService(req.params.id)
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

// ================= GET LEAVES BY ORGANIZATION =================
const getLeafDepartmentsByOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await getLeafDepartmentsByOrganizationService(
      req.params.organizationId
    )
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
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllDepartments,
  getDepartmentById,
  getLeafDepartmentsByOrganization
}
