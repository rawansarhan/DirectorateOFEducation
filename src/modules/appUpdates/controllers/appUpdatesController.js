const asyncHandler = require('../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../core/utils/apiResponder')

const {
  getSettingsService,
  listApplicationsService,
  updateApplicationService,
  listVersionsService,
  createVersionService,
  updateVersionService,
  deleteVersionService
} = require('../services/appUpdatesService')

// ================= PUBLIC =================
const getSettings = asyncHandler(async (req, res) => {
  try {
    const result = await getSettingsService({
      app: req.query.app,
      platform: req.query.platform || req.header('Platform'),
      currentVersionCode:
        req.query.current_version_code ?? req.header('X-Current-Version-Code')
    })

    return ApiResponder.okResponse(res, result, 'ok')
  } catch (err) {
    const statusCode = err.statusCode || 400
    if (statusCode === 404) return ApiResponder.notFoundResponse(res, err.message)
    return ApiResponder.error(res, { message: err.message, statusCode })
  }
})

// ================= ADMIN: Applications =================
const listApplications = asyncHandler(async (req, res) => {
  const result = await listApplicationsService()
  return ApiResponder.okResponse(res, result, 'تم جلب التطبيقات بنجاح')
})

const updateApplication = asyncHandler(async (req, res) => {
  try {
    const result = await updateApplicationService(req.params.appId, req.body)
    return ApiResponder.okResponse(res, result, 'تم تعديل التطبيق بنجاح')
  } catch (err) {
    const statusCode = err.statusCode || 400
    return ApiResponder.error(res, { message: err.message, statusCode })
  }
})

// ================= ADMIN: Versions =================
const listVersions = asyncHandler(async (req, res) => {
  try {
    const result = await listVersionsService(req.params.appId)
    return ApiResponder.okResponse(res, result, 'تم جلب الإصدارات بنجاح')
  } catch (err) {
    const statusCode = err.statusCode || 400
    return ApiResponder.error(res, { message: err.message, statusCode })
  }
})

const createVersion = asyncHandler(async (req, res) => {
  try {
    const result = await createVersionService(req.params.appId, req.body)
    return ApiResponder.createdResponse(res, result, 'تم إنشاء الإصدار بنجاح')
  } catch (err) {
    const statusCode = err.statusCode || 400
    return ApiResponder.error(res, { message: err.message, statusCode })
  }
})

const updateVersion = asyncHandler(async (req, res) => {
  try {
    const result = await updateVersionService(req.params.appId, req.params.versionId, req.body)
    return ApiResponder.okResponse(res, result, 'تم تعديل الإصدار بنجاح')
  } catch (err) {
    const statusCode = err.statusCode || 400
    return ApiResponder.error(res, { message: err.message, statusCode })
  }
})

const deleteVersion = asyncHandler(async (req, res) => {
  try {
    await deleteVersionService(req.params.appId, req.params.versionId)
    return ApiResponder.okResponse(res, null, 'تم حذف الإصدار بنجاح')
  } catch (err) {
    const statusCode = err.statusCode || 400
    return ApiResponder.error(res, { message: err.message, statusCode })
  }
})

module.exports = {
  getSettings,
  listApplications,
  updateApplication,
  listVersions,
  createVersion,
  updateVersion,
  deleteVersion
}
