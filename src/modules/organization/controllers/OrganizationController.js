const asyncHandler = require('../../../core/middleware/asyncHandler')


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
    return res.status(201).json({
      success: true,
      message: 'تم إنشاء المؤسسة بنجاح',
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
const updateOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await updateOrganizationService(req.body, req.params.id)
    return res.status(200).json({
      success: true,
      message: 'تم تعديل المؤسسة بنجاح',
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
const deleteOrganization = asyncHandler(async (req, res) => {
  try {
    const result = await deleteOrganizationService(req.params.id)
    return res.status(200).json({
      success: true,
      message: 'تم حذف المؤسسة بنجاح',
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
const getAllOrganizations = asyncHandler(async (req, res) => {
  try {
    const result = await getAllOrganizationsService()
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
const getOrganizationById = asyncHandler(async (req, res) => {
  try {
    const result = await getOrganizationByIdService(req.params.id)
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
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getAllOrganizations,
  getOrganizationById
}
