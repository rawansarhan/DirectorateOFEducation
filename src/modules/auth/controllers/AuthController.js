'use strict'

const {
  registerEmployee,
  registerCitizen,
  verifyRegisterOtp,
  loginCitizen,
  loginTechnicalOfficer,
  loginEmployee,
  verifyLoginOtp,
  registerDeviceToken,
  resendOtp,
} = require('../services/Auth')

const {
  setupPin,
  verifyAppPin,
  changePin,
  deletePin,
  employeeVerifyPin,
  createEmployeeChallenge,
  verifyEmployeeSignature,
} = require('../services/pinAuthService')

const tokenService = require('../services/tokenService')

const {
  validateSetupPin,
  validateVerifyAppPin,
  validateChangePin,
  validateDeletePin,
  validateEmployeeVerifyPin,
  validateCreateChallenge,
  validateVerifySignature,
  validateRefreshToken,
  validateResendOtp,
} = require('../validations/authValidations')

const { getClientMeta } = require('../../../core/security/securityConfig')
const { respondIfSecurityError } = require('../../../core/security/securityResponseHelper')
const ApiResponder = require('../../../core/utils/apiResponder')

function handleControllerError (res, err, defaultStatus = 400) {
  if (respondIfSecurityError(res, err, defaultStatus)) {
    return
  }

  return ApiResponder.error(res, {
    message: err.message,
    statusCode: err.statusCode || defaultStatus,
    data: null
  })
}

const registerEmployeeUser = async (req, res) => {
  try {
    const result = await registerEmployee(req.body)
    return ApiResponder.okResponse(res, result, 'تم تسجيل الموظف بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

const registerCitizenUser = async (req, res) => {
  try {
    const result = await registerCitizen(req.body)
    return ApiResponder.okResponse(res, result, 'تم تسجيل المواطن بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

const verifyRegisterOtpUser = async (req, res) => {
  try {
    const result = await verifyRegisterOtp(req.body, getClientMeta(req))
    return ApiResponder.createdResponse(res, result, 'تم تأكيد رمز التحقق بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

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

const employeeVerifyPinUser = async (req, res) => {
  try {
    const { error } = validateEmployeeVerifyPin(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await employeeVerifyPin({
      ...req.body,
      clientMeta: getClientMeta(req)
    })
    return ApiResponder.okResponse(res, result, 'تم التحقق من كلمة مرور الموظف بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 401)
  }
}

const employeeChallengeUser = async (req, res) => {
  try {
    const { error } = validateCreateChallenge(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await createEmployeeChallenge({
      ...req.body,
      clientMeta: getClientMeta(req)
    })
    return ApiResponder.okResponse(res, result, 'تم إنشاء تحدي التوقيع بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

const employeeVerifySignatureUser = async (req, res) => {
  try {
    const { error } = validateVerifySignature(req.body)

    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await verifyEmployeeSignature({
      ...req.body,
      clientMeta: getClientMeta(req)
    })
    return ApiResponder.okResponse(res, result, 'تم التحقق من التوقيع بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 401)
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
  registerEmployeeUser,
  registerCitizenUser,
  verifyRegisterOtpUser,
  loginUser,
  loginTechnicalOfficerUser,
  loginEmployeeUser,
  verifyLoginOtpUser,
  registerDeviceTokenUser,
  setupPinUser,
  verifyAppPinUser,
  changePinUser,
  deletePinUser,
  employeeVerifyPinUser,
  employeeChallengeUser,
  employeeVerifySignatureUser,
  refreshTokenUser,
  logoutUser,
  resendOtpUser,
}
