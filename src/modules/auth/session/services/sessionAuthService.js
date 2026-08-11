'use strict'

const bcrypt = require('bcryptjs')

const userRepository = require('../../shared/repositories/userRepository')
const otpCodeRepository = require('../../shared/repositories/otpCodeRepository')
const userRoleAssignmentRepository = require('../../shared/repositories/userRoleAssignmentRepository')
const userDeviceTokenRepository = require('../../shared/repositories/userDeviceTokenRepository')
const securityGuardService = require('../../../../core/security/securityGuardService')
const tokenService = require('../../shared/services/tokenService')

const {
  validateLogin,
  validateVerifyOtp,
  validateDeviceToken,
} = require('../validations/sessionValidations')

const { LoginInputDTO } = require('../dto/LoginInputDTO')
const { LoginOutputDTO } = require('../dto/LoginOutputDTO')


const {
  OTP_TTL_MINUTES,
  handleSecurityFailure,
  saveAndSendOtp,
} = require('../../shared/services/otpAuthHelpers')


const LOGIN_AUDIENCE = {
  CITIZEN: 'CITIZEN',
  TECHNICAL_OFFICER: 'TECHNICAL_OFFICER',
  EMPLOYEE: 'EMPLOYEE'
}

const ROLE_CODE = {
  CITIZEN: 'CITIZEN',
  TECHNICAL_OFFICER: 'TECHNICAL_OFFICER'
}

function createLoginAudienceError (message) {
  const err = new Error(message)
  err.statusCode = 403
  return err
}

/**
 * CITIZEN: كل OrgDepRole الفعّالة يجب أن تكون CITIZEN فقط
 * TECHNICAL_OFFICER: كل OrgDepRole الفعّالة يجب أن تكون TECHNICAL_OFFICER فقط
 * EMPLOYEE: يمنع CITIZEN و TECHNICAL_OFFICER — يسمح بأي دور آخر
 */
function assertLoginAudience (roleCodes = [], audience) {
  const codes = [...new Set(roleCodes.filter(Boolean))]

  if (audience === LOGIN_AUDIENCE.CITIZEN) {
    if (!codes.length || codes.some(code => code !== ROLE_CODE.CITIZEN)) {
      throw createLoginAudienceError(
        'هذا الحساب غير مسموح له بتسجيل الدخول من بوابة المواطن'
      )
    }
    return
  }

  if (audience === LOGIN_AUDIENCE.TECHNICAL_OFFICER) {
    if (
      !codes.length ||
      codes.some(code => code !== ROLE_CODE.TECHNICAL_OFFICER)
    ) {
      throw createLoginAudienceError(
        'هذا الحساب غير مسموح له بتسجيل الدخول من بوابة المسؤول التقني'
      )
    }
    return
  }

  if (audience === LOGIN_AUDIENCE.EMPLOYEE) {
    if (!codes.length) {
      throw createLoginAudienceError(
        'هذا الحساب غير مسموح له بتسجيل الدخول من بوابة الموظفين'
      )
    }

    if (
      codes.some(
        code =>
          code === ROLE_CODE.CITIZEN ||
          code === ROLE_CODE.TECHNICAL_OFFICER
      )
    ) {
      throw createLoginAudienceError(
        'هذا الحساب غير مسموح له بتسجيل الدخول من بوابة الموظفين'
      )
    }
  }
}

async function login (
  userData,
  clientMeta = {},
  { audience = LOGIN_AUDIENCE.CITIZEN } = {}
) {
  const { error } = validateLogin(userData)

  if (error) {
    throw new Error(
      error.details.map(d => d.message).join(', ')
    )
  }

  const inputDTO = new LoginInputDTO(userData)

  const user =
    await userRepository.findByUserName(
      inputDTO.userName
    )

  if (!user) {
    throw new Error(
      'اسم المستخدم أو كلمة المرور غير صحيحة'
    )
  }

  const isValid = await bcrypt.compare(
    inputDTO.password,
    user.password
  )

  if (!isValid) {
    await handleSecurityFailure({
      userId: user.id,
      action: 'LOGIN_FAILED',
      message:
        'اسم المستخدم أو كلمة المرور غير صحيحة',
      clientMeta,
      resourceType: 'auth',
      resourceId: user.id
    })
  }

  if (!user.is_active) {
    throw new Error(
      'الحساب غير مفعّل. يرجى إكمال عملية التحقق أو التواصل مع الدعم الفني'
    )
  }

  const roleCodes =
    await userRoleAssignmentRepository.findActiveRoleCodesByUserId(
      user.id
    )

  assertLoginAudience(roleCodes, audience)

  if (!user.phone_number) {
    throw new Error(
      'لا يوجد رقم هاتف مرتبط بهذا الحساب. يرجى التواصل مع الدعم الفني'
    )
  }

  const session_id =
    await saveAndSendOtp(
      user.id,
      user.phone_number
    )

  await securityGuardService.recordSuccess({
    userId: user.id,
    action: 'LOGIN_OTP_SENT',
    resourceType: 'auth',
    resourceId: user.id,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    session_id,
    message:
      `تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال ${OTP_TTL_MINUTES} دقائق.`,
  }
}

async function loginCitizen (userData, clientMeta = {}) {
  return login(userData, clientMeta, {
    audience: LOGIN_AUDIENCE.CITIZEN
  })
}

async function loginTechnicalOfficer (userData, clientMeta = {}) {
  return login(userData, clientMeta, {
    audience: LOGIN_AUDIENCE.TECHNICAL_OFFICER
  })
}

async function loginEmployee (userData, clientMeta = {}) {
  return login(userData, clientMeta, {
    audience: LOGIN_AUDIENCE.EMPLOYEE
  })
}

// ================== VERIFY LOGIN OTP ==================

async function verifyLoginOtp (
  { session_id, otp },
  clientMeta = {}
) {
  const { error } =
    validateVerifyOtp({
      session_id,
      otp
    })

  if (error) {
    throw new Error(
      error.details.map(d => d.message).join(', ')
    )
  }

  const record =
    await otpCodeRepository.findBySessionId(
      session_id
    )

  if (!record) {
    throw new Error(
      'جلسة التحقق غير صالحة أو منتهية. يرجى تسجيل الدخول مرة أخرى لإرسال رمز تحقق جديد'
    )
  }

  if (new Date() > record.expires_at) {
    throw new Error(
      `انتهت صلاحية رمز التحقق (مدة الصلاحية ${OTP_TTL_MINUTES} دقائق). يرجى طلب رمز تحقق جديد`
    )
  }

  if (record.otp !== otp) {
    await handleSecurityFailure({
      userId: record.user_id,
      action: 'LOGIN_OTP_FAILED',
      message:
        'رمز التحقق غير صحيح',
      clientMeta,
      resourceType: 'auth',
      resourceId: record.user_id
    })
  }

  const user =
    await userRepository.findById(
      record.user_id
    )

  if (!user) {
    throw new Error(
      'الحساب غير موجود. ربما تم حذفه. يرجى التواصل مع الدعم الفني'
    )
  }

  await otpCodeRepository.destroyInstance(record)

  const roleAssign =
    await userRoleAssignmentRepository.findActiveRolesDetailedByUserId(
      user.id
    )

  const { accessToken, refreshToken } = await tokenService.issueTokens(
    user.id,
    clientMeta
  )

  await securityGuardService.recordSuccess({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    resourceType: 'auth',
    resourceId: user.id,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    user: new LoginOutputDTO(user),
    roles: roleAssign.map(item => {
      const odr = item.org_department_role
      const role = odr?.role
      const department = odr?.department
      const organization = odr?.organization

      return {
        organization_department_roles_id: item.organization_department_roles_id,
        role_id: role?.id ?? null,
        role_name: role?.name ?? null,
        department_id: department?.id ?? null,
        department_name: department?.name ?? null,
        organization_id: organization?.id ?? odr?.organization_id ?? null,
        organization_name: organization?.name ?? null
      }
    }),
    token: accessToken,
    refreshToken,
  }
}

// ================== RESEND OTP ==================

async function resendOtp ({ session_id }) {
  const record = await otpCodeRepository.findBySessionId(session_id)

  if (!record) {
    throw new Error(
      'الجلسة غير موجودة أو انتهت صلاحيتها. يرجى البدء من جديد'
    )
  }

  const user = await userRepository.findById(record.user_id)

  if (!user) {
    throw new Error(
      'الحساب غير موجود. يرجى التواصل مع الدعم الفني'
    )
  }

  if (!user.phone_number) {
    throw new Error(
      'لا يوجد رقم هاتف مرتبط بهذا الحساب. يرجى التواصل مع الدعم الفني'
    )
  }

  const new_session_id = await saveAndSendOtp(user.id, user.phone_number)

  return {
    session_id: new_session_id,
    message: `تم إعادة إرسال رمز التحقق على رقم الموبايل. أدخله خلال ${OTP_TTL_MINUTES} دقائق.`,
  }
}

// ================== DEVICE TOKEN ==================

async function registerDeviceToken (
  userId,
  payload,
  clientMeta = {}
) {
  const { error } =
    validateDeviceToken(payload)

  if (error) {
    throw new Error(
      error.details.map(d => d.message).join(', ')
    )
  }

  const {
    fcm_token,
    platform,
    device_id
  } = payload

  const existingToken =
    await userDeviceTokenRepository.findByFcmToken(
      fcm_token
    )

  let record
  let reused = false

  if (existingToken) {
    await userDeviceTokenRepository.update(
      existingToken,
      {
        user_id: userId,
        platform:
          platform || existingToken.platform,
        device_id:
          device_id || existingToken.device_id,
        is_active: true
      }
    )

    record = existingToken
    reused = true
  } else {
    record = await userDeviceTokenRepository.create({
      user_id: userId,
      fcm_token,
      platform: platform || null,
      device_id: device_id || null,
      is_active: true
    })
  }

  const {
    auditSuccess
  } = require('../../../../core/security/safeAudit')
  const {
    AUDIT_ACTIONS
  } = require('../../../../core/security/auditActions')
  const { createHash } = require('crypto')

  const tokenFingerprint = createHash('sha256')
    .update(String(fcm_token))
    .digest('hex')
    .slice(0, 16)

  await auditSuccess({
    userId,
    action: AUDIT_ACTIONS.DEVICE_TOKEN_REGISTERED,
    resourceType: 'user_device_token',
    resourceId: record.id,
    ipAddress: clientMeta.ip || null,
    userAgent: clientMeta.userAgent || null,
    details: {
      deviceTokenId: record.id,
      platform: record.platform || platform || null,
      device_id: record.device_id || device_id || null,
      reused,
      tokenFingerprint
    }
  })

  return record
}

module.exports = {
  login,
  loginCitizen,
  loginTechnicalOfficer,
  loginEmployee,
  LOGIN_AUDIENCE,
  verifyLoginOtp,
  registerDeviceToken,
  resendOtp,
}
