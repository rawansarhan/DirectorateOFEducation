'use strict'

const { Application, AppVersion } = require('../../../entities')
const {
  ValidateUpsertApplication,
  ValidateCreateVersion,
  ValidateUpdateVersion
} = require('../validations/appUpdatesValidation')

function throwValidation (error) {
  const msg = error.details.map(d => d.message).join(' | ')
  const err = new Error(msg)
  err.statusCode = 400
  throw err
}

function notFound (message) {
  const err = new Error(message)
  err.statusCode = 404
  throw err
}

// ======================================================
// GET /settings — نقطة النهاية العامة التي يستدعيها التطبيق عند كل إقلاع
// ======================================================
async function getSettingsService ({ app, platform, currentVersionCode }) {
  const appName = String(app || '').trim().toLowerCase()
  if (!appName) {
    const err = new Error('حقل app مطلوب')
    err.statusCode = 422
    throw err
  }

  const application = await Application.findOne({ where: { name: appName } })
  if (!application) {
    const err = new Error('التطبيق غير موجود')
    err.statusCode = 404
    throw err
  }

  const allowedPlatforms = ['android', 'ios', 'windows']
  const resolvedPlatform = allowedPlatforms.includes(platform) ? platform : 'android'
  const currentCode = Number.isFinite(Number(currentVersionCode)) ? Number(currentVersionCode) : 0

  const noUpdate = {
    force_update_enabled: false,
    soft_update_enabled: false,
    app_info: null
  }

  const latestVersion = await AppVersion.findOne({
    where: { application_id: application.id, status: 'active', platform: resolvedPlatform },
    order: [['version_code', 'DESC']]
  })

  if (!latestVersion || latestVersion.version_code <= currentCode) {
    return noUpdate
  }

  const forceUpdate = latestVersion.isForceUpdateFor(currentCode)
  const softUpdate = !forceUpdate && latestVersion.isSoftUpdateFor(currentCode)

  if (!forceUpdate && !softUpdate) {
    return noUpdate
  }

  // ثلاثة شروط مجتمعة لاستخدام direct، وإلا fail-safe إلى store — لا تعطيل أبداً.
  const useDirect =
    application.usesDirectDownload() &&
    ['android', 'windows'].includes(resolvedPlatform) &&
    !!latestVersion.apk_url

  let strategy
  let downloadUrl
  let apkSize

  if (useDirect) {
    strategy = 'direct'
    downloadUrl = latestVersion.apk_url
    apkSize = latestVersion.apk_size
  } else {
    strategy = 'store'
    downloadUrl = application.getStoreUrlForPlatform(resolvedPlatform)
    apkSize = null
  }

  return {
    force_update_enabled: forceUpdate,
    soft_update_enabled: softUpdate,
    app_info: {
      id: latestVersion.id,
      application_name: application.name,
      display_name: application.display_name,
      package_name: application.package_name,
      version_name: latestVersion.version_name,
      version_code: latestVersion.version_code,
      changelog: latestVersion.changelog,
      force_update: forceUpdate,
      update_strategy: strategy,
      download_url: downloadUrl,
      apk_size: apkSize
    }
  }
}

// ======================================================
// ADMIN — Applications
// ======================================================
async function listApplicationsService () {
  return Application.findAll({ order: [['name', 'ASC']] })
}

async function updateApplicationService (appId, data) {
  const { error, value } = ValidateUpsertApplication(data)
  if (error) throwValidation(error)

  const application = await Application.findByPk(appId)
  if (!application) notFound('التطبيق غير موجود')

  await application.update(value)
  return application
}

// ======================================================
// ADMIN — Versions
// ======================================================
async function listVersionsService (appId) {
  const application = await Application.findByPk(appId)
  if (!application) notFound('التطبيق غير موجود')

  return AppVersion.findAll({
    where: { application_id: appId },
    order: [['platform', 'ASC'], ['version_code', 'DESC']]
  })
}

async function createVersionService (appId, data) {
  const { error, value } = ValidateCreateVersion(data)
  if (error) throwValidation(error)

  const application = await Application.findByPk(appId)
  if (!application) notFound('التطبيق غير موجود')

  // إصدار جديد يُنشأ inactive افتراضياً — يُفعَّل يدوياً بعد التأكد أن الملف مرفوع والرابط يعمل.
  return AppVersion.create({
    application_id: appId,
    platform: value.platform,
    version_name: value.version_name,
    version_code: value.version_code,
    apk_url: value.apk_url || null,
    apk_size: value.apk_size ?? null,
    changelog: value.changelog || null,
    force_update_below_version_code: value.force_update_below_version_code ?? null,
    soft_update_below_version_code: value.soft_update_below_version_code ?? null,
    status: value.status || 'inactive'
  })
}

async function updateVersionService (appId, versionId, data) {
  const { error, value } = ValidateUpdateVersion(data)
  if (error) throwValidation(error)

  const version = await AppVersion.findOne({ where: { id: versionId, application_id: appId } })
  if (!version) notFound('الإصدار غير موجود')

  await version.update(value)
  return version
}

async function deleteVersionService (appId, versionId) {
  const version = await AppVersion.findOne({ where: { id: versionId, application_id: appId } })
  if (!version) notFound('الإصدار غير موجود')

  await version.destroy()
  return true
}

module.exports = {
  getSettingsService,
  listApplicationsService,
  updateApplicationService,
  listVersionsService,
  createVersionService,
  updateVersionService,
  deleteVersionService
}
