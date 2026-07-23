'use strict'

const asyncHandler = require('../../../../core/middleware/asyncHandler')
const ApiResponder = require('../../../../core/utils/apiResponder')
const {
  listPermissions,
  getRolePermissions,
  createRolePermissions,
  updateRolePermissions
} = require('../services/permissionRoleService')

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
    const result = await createRolePermissions(req.body)
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
    const result = await updateRolePermissions(req.body)
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
  getRolePermissionsController,
  createRolePermissionsController,
  updateRolePermissionsController
}
