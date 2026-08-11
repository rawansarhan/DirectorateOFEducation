'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const { getClientMeta } = require('../../../../core/security/securityConfig')
const {
  listPermissions,
  listPermissionsByAudience,
  getRolePermissions,
  createRolePermissions,
  updateRolePermissions
} = require('../services/permissionRoleService')

function buildAuditContext (req) {
  const meta = getClientMeta(req)
  return {
    actorUserId: req.user?.id || null,
    ip: meta.ip,
    userAgent: meta.userAgent
  }
}

const listPermissionsController = asyncHandler(async (req, res) => {
  try {
    const result = await listPermissions()
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || null
    })
  }
})

const listEmployeePermissionsController = asyncHandler(async (req, res) => {
  try {
    const result = await listPermissionsByAudience('employee')
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || null
    })
  }
})

const listAdminPermissionsController = asyncHandler(async (req, res) => {
  try {
    const result = await listPermissionsByAudience('admin')
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || null
    })
  }
})

const getRolePermissionsController = asyncHandler(async (req, res) => {
  try {
    const result = await getRolePermissions(req.query)
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || null
    })
  }
})

const createRolePermissionsController = asyncHandler(async (req, res) => {
  try {
    const result = await createRolePermissions(req.body, buildAuditContext(req))
    return ApiResponder.createdResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || null
    })
  }
})

const updateRolePermissionsController = asyncHandler(async (req, res) => {
  try {
    const result = await updateRolePermissions(req.body, buildAuditContext(req))
    return ApiResponder.okResponse(res, result.data, result.message)
  } catch (err) {
    return ApiResponder.error(res, {
      message: err.message,
      statusCode: err.statusCode || 400,
      error: err.code || null
    })
  }
})

module.exports = {
  listPermissionsController,
  listEmployeePermissionsController,
  listAdminPermissionsController,
  getRolePermissionsController,
  createRolePermissionsController,
  updateRolePermissionsController
}
