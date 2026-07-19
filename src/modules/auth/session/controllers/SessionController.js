'use strict'

const {
  loginCitizen,
  loginTechnicalOfficer,
  loginEmployee,
  verifyLoginOtp,
  registerDeviceToken,
  resendOtp,
} = require('../services/sessionAuthService')

const tokenService = require('../../shared/services/tokenService')

const {
  validateRefreshToken,
  validateResendOtp,
} = require('../validations/sessionValidations')

const { getClientMeta } = require('../../../../core/security/securityConfig')
const { handleControllerError } = require('../../shared/controllers/controllerError')
const ApiResponder = require('../../../../core/utils/apiResponder')

const loginUser = async (req, res) => {
  try {
    const result = await loginCitizen(req.body, getClientMeta(req))
    return ApiResponder.okResponse(res, result, 'تم تسجيل الدخول بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 401)
  }
}

const loginTechnicalOfficerUser = async (req, res) => {
  try {
    const result = await loginTechnicalOfficer(req.body, getClientMeta(req))
    return ApiResponder.okResponse(res, result, 'تم تسجيل الدخول بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 401)
  }
}

const loginEmployeeUser = async (req, res) => {
  try {
    const result = await loginEmployee(req.body, getClientMeta(req))
    return ApiResponder.okResponse(res, result, 'تم تسجيل الدخول بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 401)
  }
}

const verifyLoginOtpUser = async (req, res) => {
  try {
    const result = await verifyLoginOtp(req.body, getClientMeta(req))
    return ApiResponder.okResponse(res, result, 'تم تأكيد رمز الدخول بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 401)
  }
}

const registerDeviceTokenUser = async (req, res) => {
  try {
    const result = await registerDeviceToken(req.user.id, req.body)
    return ApiResponder.okResponse(
      res,
      {
        id: result.id,
        user_id: result.user_id,
        platform: result.platform,
        device_id: result.device_id,
        is_active: result.is_active
      },
      'تم تسجيل جهاز الإشعارات بنجاح'
    )
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

const refreshTokenUser = async (req, res) => {
  try {
    const { error } = validateRefreshToken(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await tokenService.rotateRefreshToken(
      req.body.refreshToken,
      getClientMeta(req)
    )

    return ApiResponder.okResponse(
      res,
      {
        token: result.accessToken,
        refreshToken: result.refreshToken
      },
      'تم تحديث رمز الدخول بنجاح'
    )
  } catch (err) {
    return handleControllerError(res, err, err.statusCode || 401)
  }
}

const resendOtpUser = async (req, res) => {
  try {
    const { error } = validateResendOtp(req.body)

    if (error) {
      throw new Error(error.details.map(d => d.message).join(', '))
    }

    const result = await resendOtp(req.body)
    return ApiResponder.okResponse(res, result, 'تم إعادة إرسال رمز التحقق بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

const logoutUser = async (req, res) => {
  try {
    const { error } = validateRefreshToken(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await tokenService.revokeRefreshToken(req.body.refreshToken)

    return ApiResponder.okResponse(
      res,
      { revoked: result.revoked },
      'تم تسجيل الخروج بنجاح'
    )
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

module.exports = {
  loginUser,
  loginTechnicalOfficerUser,
  loginEmployeeUser,
  verifyLoginOtpUser,
  registerDeviceTokenUser,
  refreshTokenUser,
  logoutUser,
  resendOtpUser,
}
