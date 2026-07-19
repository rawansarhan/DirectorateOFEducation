'use strict'

const {
  employeeVerifyPin,
  createEmployeeChallenge,
  verifyEmployeeSignature,
} = require('../services/challengeAuthService')

const {
  validateEmployeeVerifyPin,
  validateCreateChallenge,
  validateVerifySignature,
} = require('../validations/challengeValidations')

const { getClientMeta } = require('../../../../core/security/securityConfig')
const { handleControllerError } = require('../../shared/controllers/controllerError')
const ApiResponder = require('../../../../core/utils/apiResponder')

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

module.exports = {
  employeeVerifyPinUser,
  employeeChallengeUser,
  employeeVerifySignatureUser,
}
