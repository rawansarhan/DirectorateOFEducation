'use strict'



const {

  registerEmployee,

  registerCitizen,

  verifyRegisterOtp,

  login,

  verifyLoginOtp,

  registerDeviceToken,

} = require('../services/Auth')



const {

  setupPin,

  verifyAppPin,

  changePin,

  employeeVerifyPin,

  createEmployeeChallenge,

  verifyEmployeeSignature,

} = require('../services/pinAuthService')



const {

  validateSetupPin,

  validateVerifyAppPin,

  validateChangePin,

  validateEmployeeVerifyPin,

  validateCreateChallenge,

  validateVerifySignature,

} = require('../validations/authValidations')



const { getClientMeta } = require('../../../core/security/securityConfig')

const { respondIfSecurityError } = require('../../../core/security/securityResponseHelper')



function handleControllerError (res, err, defaultStatus = 400) {

  if (respondIfSecurityError(res, err, defaultStatus)) {

    return

  }



  return res.status(defaultStatus).json({ success: false, message: err.message })

}



const registerEmployeeUser = async (req, res) => {

  try {

    const result = await registerEmployee(req.body)

    return res.status(200).json({ success: true, data: result })

  } catch (err) {

    return handleControllerError(res, err, 400)

  }

}



const registerCitizenUser = async (req, res) => {

  try {

    const result = await registerCitizen(req.body)

    return res.status(200).json({ success: true, data: result })

  } catch (err) {

    return handleControllerError(res, err, 400)

  }

}



const verifyRegisterOtpUser = async (req, res) => {

  try {

    const result = await verifyRegisterOtp(req.body, getClientMeta(req))

    return res.status(201).json({ success: true, data: result })

  } catch (err) {

    return handleControllerError(res, err, 400)

  }

}



const loginUser = async (req, res) => {

  try {

    const result = await login(req.body, getClientMeta(req))

    return res.status(200).json({ success: true, data: result })

  } catch (err) {

    return handleControllerError(res, err, 401)

  }

}



const verifyLoginOtpUser = async (req, res) => {

  try {

    const result = await verifyLoginOtp(req.body, getClientMeta(req))

    return res.status(200).json({ success: true, data: result })

  } catch (err) {

    return handleControllerError(res, err, 401)

  }

}



const registerDeviceTokenUser = async (req, res) => {

  try {

    const result = await registerDeviceToken(req.user.id, req.body)

    return res.status(200).json({

      success: true,

      data: {

        id: result.id,

        user_id: result.user_id,

        platform: result.platform,

        device_id: result.device_id,

        is_active: result.is_active

      }

    })

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

    return res.status(200).json({ success: true, data: result })

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

    return res.status(200).json({ success: true, data: result })

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

    return res.status(200).json({ success: true, data: result })

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

    return res.status(200).json({ success: true, data: result })

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

    return res.status(200).json({ success: true, data: result })

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

    return res.status(200).json({ success: true, data: result })

  } catch (err) {

    return handleControllerError(res, err, 401)

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

  employeeVerifySignatureUser,

}

