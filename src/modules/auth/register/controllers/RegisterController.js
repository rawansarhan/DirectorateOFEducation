'use strict'

const {
  registerEmployee,
  registerCitizen,
  verifyRegisterOtp,
} = require('../services/registerAuthService')

const { getClientMeta } = require('../../../../core/security/securityConfig')
const { handleControllerError } = require('../../shared/controllers/controllerError')
const ApiResponder = require('../../../../core/utils/apiResponder')

const registerEmployeeUser = async (req, res) => {
  try {
    const meta = getClientMeta(req)
    const result = await registerEmployee(req.body, {
      actorUserId: req.user?.id || null,
      ip: meta.ip,
      userAgent: meta.userAgent
    })
    return ApiResponder.okResponse(res, result, 'تم تسجيل الموظف بنجاح')
  } catch (err) {
    return handleControllerError(res, err, 400)
  }
}

const registerCitizenUser = async (req, res) => {
  try {
    //اضفنا الميتا داتا لتحقق من المستخدم الذي يقوم بالتسجيل 
    const meta = getClientMeta(req)
    const result = await registerCitizen(req.body, {
      ip: meta.ip,
      userAgent: meta.userAgent
    })
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

module.exports = {
  registerEmployeeUser,
  registerCitizenUser,
  verifyRegisterOtpUser,
}
