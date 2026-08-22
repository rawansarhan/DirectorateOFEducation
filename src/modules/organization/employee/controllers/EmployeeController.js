const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const { getClientMeta } = require('../../../../core/security/securityConfig')

const {
  getAllEmployeesService,
  searchEmployeesService,
  getEmployeeByIdService,
  getUsersByOrgRoleDeptService,
  updateEmployeeService
} = require('../services/employee')

const {
  parseDepartmentIds,
  getDepartmentEmployeesService
} = require('../services/departmentEmployeeService')

const {
  parseCursorPaginationQuery,
  decodeCursor
} = require('../../../../core/utils/pagination')

// ================= GET ALL (paginated + search) =================
const getAllEmployees = asyncHandler(async (req, res) => {
  try {
    const result = await getAllEmployeesService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب الموظفين بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

const searchEmployees = asyncHandler(async (req, res) => {
  try {
    const result = await searchEmployeesService(req.query)
    return ApiResponder.okResponse(res, result, 'تم جلب نتائج بحث الموظفين بنجاح')
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

// ================= GET BY DEPARTMENTS (workload) =================
const getEmployeesByDepartments = asyncHandler(async (req, res) => {
  try {
    const { limit, cursor } = parseCursorPaginationQuery(req.query)
    const departmentIds = parseDepartmentIds({ query: req.query })

    const result = await getDepartmentEmployeesService({
      userId: req.user.id,
      departmentIds,
      cursor,
      decodedCursor: cursor ? decodeCursor(cursor) : null,
      limit
    })

    return ApiResponder.okResponse(res, result, 'تم جلب موظفي الدوائر بنجاح')
  } catch (err) {
    const statusCode =
      err.statusCode ||
      (err.code === 'FORBIDDEN' ? 403 : err.code === 'VALIDATION_ERROR' ? 400 : 500)

    return ApiResponder.error(res, { message: err.message, statusCode })
  }
})

// ================= GET USERS BY organization + role + department =================
const getUsersByOrgRoleDept = asyncHandler(async (req, res) => {
  try {
    const result = await getUsersByOrgRoleDeptService(req.query)
    return ApiResponder.okResponse(
      res,
      result,
      'تم جلب المستخدمين حسب دور المؤسسة/القسم بنجاح'
    )
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400
    })
  }
})

// ================= UPDATE =================
const updateEmployee = asyncHandler(async (req, res) => {
  try {
    const meta = getClientMeta(req)
    const result = await updateEmployeeService(req.body, req.params.id, {
      actorUserId: req.user?.id || null,
      ip: meta.ip,
      userAgent: meta.userAgent
    })
    return ApiResponder.okResponse(res, result, 'تم تعديل بيانات الموظف بنجاح')
  } catch (err) {
    return ApiResponder.error(res, { message: err.message, statusCode: err.statusCode || 400 })
  }
})

const getEmployeeSelfCard = asyncHandler(async (req, res) => {
  try {
    const {
      getEmployeeSelfCard: getSelfCard
    } = require('../../selfCard/services/employeeSelfCardService')

    const result = await getSelfCard(req.params.id)
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || undefined
    })
  }
})

module.exports = {
  getAllEmployees,
  searchEmployees,
  getEmployeeById,
  getEmployeesByDepartments,
  getUsersByOrgRoleDept,
  updateEmployee,
  getEmployeeSelfCard
}
