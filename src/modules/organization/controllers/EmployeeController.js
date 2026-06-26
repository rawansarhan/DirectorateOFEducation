const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')

const {
  getAllEmployeesService,
  getEmployeeByIdService,
  updateEmployeeService
} = require('../services/employee')

// ================= GET ALL (paginated + search) =================
const getAllEmployees = asyncHandler(async (req, res) => {
  try {
    const result = await getAllEmployeesService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب الموظفين بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= GET BY ID =================
const getEmployeeById = asyncHandler(async (req, res) => {
  try {
    const result = await getEmployeeByIdService(req.params.id)
    return ApiResponder.okResponse(res, result, 'تم جلب بيانات الموظف بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

// ================= UPDATE =================
const updateEmployee = asyncHandler(async (req, res) => {
  try {
    const result = await updateEmployeeService(req.body, req.params.id)
    return ApiResponder.okResponse(res, result, 'تم تعديل بيانات الموظف بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

module.exports = {
  getAllEmployees,
  getEmployeeById,
  updateEmployee
}
