'use strict'

const {
  registerEmployee,
  registerCitizen,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
  registerDeviceToken
} = require('../services/Auth')

const {
  setupPin,
  verifyAppPin,
  changePin,
  employeeVerifyPin,
  createEmployeeChallenge,
  verifyEmployeeSignature
} = require('../services/pinAuthService')

const {
  validateSetupPin,
  validateVerifyAppPin,
  validateChangePin,
  validateEmployeeVerifyPin,
  validateCreateChallenge,
  validateVerifySignature
} = require('../validations/authValidations')

const { getClientMeta } = require('../../../core/security/securityConfig')
const { sendOk, sendCreated, sendControllerError } = require('../../../core/utils/controllerResponse')
const { HTTP_STATUS } = require('../../../core/middleware/httpStatusCodes')

const registerEmployeeUser = async (req, res) => {
  try {
    const result = await registerEmployee(req.body)
    return sendOk(res, result, 'تم تسجيل الموظف بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

const registerCitizenUser = async (req, res) => {
  try {
    const result = await registerCitizen(req.body)
    return sendOk(res, result, 'تم تسجيل المواطن بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

const verifyRegisterOtpUser = async (req, res) => {
  try {
    const result = await verifyRegisterOtp(req.body, getClientMeta(req))
    return sendCreated(res, result, 'تم التحقق من OTP بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

const loginUser = async (req, res) => {
  try {
    const result = await login(req.body, getClientMeta(req))
    return sendOk(res, result, 'تم تسجيل الدخول بنجاح')
  } catch (err) {
    return sendControllerError(res, err, HTTP_STATUS.UNAUTHORIZED)
  }
}

const verifyLoginOtpUser = async (req, res) => {
  try {
    const result = await verifyLoginOtp(req.body, getClientMeta(req))
    return sendOk(res, result, 'تم التحقق من OTP بنجاح')
  } catch (err) {
    return sendControllerError(res, err, HTTP_STATUS.UNAUTHORIZED)
  }
}

const registerDeviceTokenUser = async (req, res) => {
  try {
    const result = await registerDeviceToken(req.user.id, req.body)
    return sendOk(res, {
      id: result.id,
      user_id: result.user_id,
      platform: result.platform,
      device_id: result.device_id,
      is_active: result.is_active
    }, 'تم تسجيل الجهاز بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

const setupPinUser = async (req, res) => {
  try {
    const { error } = validateSetupPin(req.body)
    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await setupPin(req.user.id, req.body.pin, getClientMeta(req))
    return sendOk(res, result, 'تم إعداد PIN بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
  }
}

const verifyAppPinUser = async (req, res) => {
  try {
    const { error } = validateVerifyAppPin(req.body)
    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await verifyAppPin(req.user.id, req.body.pin, getClientMeta(req))
    return sendOk(res, result, 'تم التحقق من PIN بنجاح')
  } catch (err) {
    return sendControllerError(res, err, HTTP_STATUS.UNAUTHORIZED)
  }
}

const changePinUser = async (req, res) => {
  try {
    const { error } = validateChangePin(req.body)
    if (error) {
      throw new Error(error.details.map(item => item.message).join(', '))
    }

    const result = await changePin(req.user.id, req.body, getClientMeta(req))
    return sendOk(res, result, 'تم تغيير PIN بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
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

    return sendOk(res, result, 'تم التحقق من PIN بنجاح')
  } catch (err) {
    return sendControllerError(res, err, HTTP_STATUS.UNAUTHORIZED)
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

    return sendOk(res, result, 'تم إنشاء challenge بنجاح')
  } catch (err) {
    return sendControllerError(res, err)
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

    return sendOk(res, result, 'تم التحقق من التوقيع بنجاح')
  } catch (err) {
    return sendControllerError(res, err, HTTP_STATUS.UNAUTHORIZED)
  }
}

module.exports = {
  registerEmployeeUser,
  registerCitizenUser,
  verifyRegisterOtpUser,
  loginUser,
  verifyLoginOtpUser,
  registerDeviceTokenUser,
  setupPinUser,
  verifyAppPinUser,
  changePinUser,
  employeeVerifyPinUser,
  employeeChallengeUser,
  employeeVerifySignatureUser
}
