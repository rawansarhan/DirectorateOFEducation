const asyncHandler = require('../../../core/middleware/asyncHandler')
const { sendOk, sendCreated, sendControllerError } = require('../../../core/utils/controllerResponse')

const {
  createDepartmentService,
  updateDepartmentService,
  deleteDepartmentService,
  getAllDepartmentsService,
  getDepartmentByIdService,
  getLeafDepartmentsByOrganizationService,
  toggleDepartmentStatusService
} = require('../services/department')

const createDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await createDepartmentService(req.body)
    return sendCreated(res, result, 'تم إنشاء القسم بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const updateDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await updateDepartmentService(req.body, req.params.id)
    return sendOk(res, result, 'تم تعديل القسم بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const deleteDepartment = asyncHandler(async (req, res) => {
  try {
    const result = await deleteDepartmentService(req.params.id)
    return sendOk(res, result, 'تم حذف القسم بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getAllDepartments = asyncHandler(async (req, res) => {
  try {
    const result = await getAllDepartmentsService()
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getDepartmentById = asyncHandler(async (req, res) => {
  try {
    const result = await getDepartmentByIdService(req.params.id)
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const toggleDepartmentStatus = asyncHandler(async (req, res) => {
  try {
    const result = await toggleDepartmentStatusService(req.params.id)
    return sendOk(
      res,
      result,
      result.is_active ? 'تم تفعيل القسم بنجاح' : 'تم تعطيل القسم بنجاح'
    )
  } catch (err) {
    return sendControllerError(res, err)
  }
})

const getLeafDepartmentsByOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await getLeafDepartmentsByOrganizationService(
      req.params.organizationId
    )
    return sendOk(res, result, 'تم جلب البيانات بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
})

module.exports = {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getAllDepartments,
  getDepartmentById,
  getLeafDepartmentsByOrganization,
  toggleDepartmentStatus
}
