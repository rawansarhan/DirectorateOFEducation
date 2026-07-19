'use strict'

const {
  setupPin,
  verifyAppPin,
  changePin,
  deletePin,
} = require('../services/pinAuthService')

const {
  validateSetupPin,
  validateVerifyAppPin,
  validateChangePin,
  validateDeletePin,
} = require('../validations/pinValidations')

const { getClientMeta } = require('../../../../core/security/securityConfig')
const { handleControllerError } = require('../../shared/controllers/controllerError')
const ApiResponder = require('../../../../core/utils/apiResponder')

const setupPinUser = async (req, res) => {
  try {
    const { error } = validateSetupPin(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await setupPin(req.user.id, req.body.pin, getClientMeta(req))
    return ApiResponder.okResponse(res, result, 'تم إنشاء رمز PIN بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

const verifyAppPinUser = async (req, res) => {
  try {
    const { error } = validateVerifyAppPin(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await verifyAppPin(req.user.id, req.body.pin, getClientMeta(req))
    return ApiResponder.okResponse(res, result, 'تم التحقق من رمز PIN بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 401)
  }
}

const changePinUser = async (req, res) => {
  try {
    const { error } = validateChangePin(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await changePin(req.user.id, req.body, getClientMeta(req))
    return ApiResponder.okResponse(res, result, 'تم تغيير رمز PIN بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

const deletePinUser = async (req, res) => {
  try {
    const { error } = validateDeletePin(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await deletePin(req.user.id, req.body.pin, getClientMeta(req))
    return ApiResponder.okResponse(res, result, 'تم حذف رمز PIN بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

module.exports = {
  setupPinUser,
  verifyAppPinUser,
  changePinUser,
  deletePinUser,
}
