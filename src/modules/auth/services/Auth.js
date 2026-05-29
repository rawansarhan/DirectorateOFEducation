'use strict'
const orgDeptRolesClient = require('../../../core/shared/clients/organization/orgDeptRolesClient')

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const { v4: uuidv4 } = require('uuid')

const userRepository = require('../repositories/userRepository')
const otpCodeRepository = require('../repositories/otpCodeRepository')
const userRoleAssignmentRepository = require('../repositories/userRoleAssignmentRepository')
const userKeyRepository = require('../repositories/userKeyRepository')
const userDeviceTokenRepository = require('../repositories/userDeviceTokenRepository')
const securityGuardService = require('../../../core/security/securityGuardService')

const {
  validateRegisterEmp,
  validateRegisterCitizen,
  validateLogin,
  validateVerifyOtp,
  validateDeviceToken,
} = require('../validations/authValidations')

const { RegisterCitizenInputDTO } = require('../dto/RegisterCitizenInputDTO')
const { RegisterCitizenOutputDTO } = require('../dto/RegisterCitizenOutputDTO')
const { LoginInputDTO } = require('../dto/LoginInputDTO')
const { LoginOutputDTO } = require('../dto/LoginOutputDTO')

const { sendSms } = require('./smsService')
const {
  computeKeyFingerprint,
  hashPin,
  validatePublicKeyPem,
} = require('./cryptoAuthService')

const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key'
const OTP_TTL_MINUTES = 2

async function handleSecurityFailure ({
  userId,
  action,
  message,
  clientMeta = {},
  resourceType = 'user',
  resourceId = userId
}) {
  const failure = await securityGuardService.recordFailure({
    userId,
    action,
    resourceType,
    resourceId,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent,
    details: { message }
  })

  if (failure.locked) {
    const error = new Error('الحساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة')
    error.code = 'ACCOUNT_LOCKED'
    error.lockedUntil = failure.lockedUntil
    throw error
  }

  const error = new Error(message)
  error.remainingAttempts = failure.remainingAttempts
  throw error
}

function generateOtp () {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function saveAndSendOtp (userId, phone) {
  await otpCodeRepository.deleteByUserId(userId)

  const otp = generateOtp()
  const session_id = uuidv4()
  const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

  await otpCodeRepository.create({
    session_id,
    otp,
    phone_number: phone,
    user_id: userId,
    expires_at,
  })

  await sendSms(
    phone,
    `رمز التحقق : ${otp}\nصالح لمدة ${OTP_TTL_MINUTES} دقائق فقط.`
  )

  return session_id
}

async function registerEmployee (userData) {
  const { error } = validateRegisterEmp(userData)
  if (error) throw new Error(error.details.map(d => d.message).join(' | '))

  const existingUser = await userRepository.findByEmail(userData.email)
  if (existingUser) throw new Error('Email already exists')

  const orgDeptRole = await orgDeptRolesClient.findOrgDeptRole({
    organization_id: userData.organization_id,
    department_id: userData.department_id,
    role_id: userData.role_id
  })

  if (!orgDeptRole) {
    throw new Error(
      'لا يوجد دور مرتبط بهذه المؤسسة والقسم. تأكد من إنشاء (organization_department_role) أولاً'
    )
  }

  const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
  const pinHash = await hashPin(userData.pin)
  const publicKey = validatePublicKeyPem(userData.public_key)
  const keyFingerprint = computeKeyFingerprint(publicKey)

  const user = await userRepository.create({
    userName: userData.userName,
    email: userData.email,
    phone_number: userData.phone_number,
    password: hashedPassword,
    pin_hash: pinHash,
    is_active: true,
  })

  await userRoleAssignmentRepository.create({
    user_id: user.id,
    organization_department_roles_id: orgDeptRole.id,
  })

  await userKeyRepository.create({
    user_id: user.id,
    public_key: publicKey,
    key_fingerprint: keyFingerprint,
    algorithm: 'ed25519',
    is_active: true,
  })

  return {
    userName: userData.userName,
    key_fingerprint: keyFingerprint,
    organization_department_roles_id: orgDeptRole.id,
    message:
      'تم إنشاء حساب الموظف بنجاح. private_key يبقى في المتصفح/USB ولا يُخزَّن على السيرفر.',
  }
}

async function registerCitizen (userData) {
  const sequelize = userRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const { error } = validateRegisterCitizen(userData)

    if (error) {
      throw new Error(error.details.map(d => d.message).join(', '))
    }

    const existingUser = await userRepository.findByEmail(userData.email, {
      transaction
    })

    if (existingUser) {
      throw new Error('Email already exists')
    }

    const orgDeptRole = await orgDeptRolesClient.getCitizenRole()

    if (!orgDeptRole) {
      throw new Error('CITIZEN role not found')
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10)

    const inputUserDTO = new RegisterCitizenInputDTO({
      ...userData,
      password: hashedPassword
    })

    const user = await userRepository.create(
      { ...inputUserDTO, is_active: false },
      { transaction }
    )

    await userRoleAssignmentRepository.create({
      user_id: user.id,
      organization_department_roles_id: orgDeptRole.id
    }, { transaction })

    await transaction.commit()

    if (!user.phone_number) {
      throw new Error('لا يوجد رقم هاتف مرتبط بهذا الحساب')
    }

    const session_id = await saveAndSendOtp(user.id, user.phone_number)

    return {
      session_id,
      message: 'تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال دقيقتين.',
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

async function login (userData, clientMeta = {}) {
  const { error } = validateLogin(userData)
  if (error) throw new Error(error.details.map(d => d.message).join(', '))

  const inputDTO = new LoginInputDTO(userData)

  const user = await userRepository.findByUserName(inputDTO.userName)

  if (!user) {
    await securityGuardService.recordFailure({
      userId: null,
      action: 'LOGIN_FAILED',
      resourceType: 'auth',
      resourceId: inputDTO.userName,
      ipAddress: clientMeta.ip,
      userAgent: clientMeta.userAgent,
      details: { reason: 'user_not_found' }
    })
    throw new Error('Invalid userName or password')
  }

  await securityGuardService.assertAccountNotLocked(user.id)

  const isValid = await bcrypt.compare(inputDTO.password, user.password)

  if (!isValid) {
    await handleSecurityFailure({
      userId: user.id,
      action: 'LOGIN_FAILED',
      message: 'Invalid userName or password',
      clientMeta,
      resourceType: 'auth',
      resourceId: user.id
    })
  }

  if (!user.is_active) {
    throw new Error('الحساب غير مفعّل. سجّل من جديد أو تواصل مع الدعم')
  }

  if (!user.phone_number) {
    throw new Error('لا يوجد رقم هاتف مرتبط بهذا الحساب')
  }

  const session_id = await saveAndSendOtp(user.id, user.phone_number)

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
    message: 'تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال دقيقتين.',
  }
}

async function verifyRegisterOtp ({ session_id, otp }, clientMeta = {}) {
  const { error } = validateVerifyOtp({ session_id, otp })
  if (error) throw new Error(error.details.map(d => d.message).join(', '))

  const record = await otpCodeRepository.findBySessionId(session_id)
  if (!record) throw new Error('session_id غير صحيح')

  await securityGuardService.assertAccountNotLocked(record.user_id)

  if (record.otp !== otp) {
    await handleSecurityFailure({
      userId: record.user_id,
      action: 'REGISTER_OTP_FAILED',
      message: 'رمز OTP غير صحيح',
      clientMeta,
      resourceType: 'auth',
      resourceId: session_id
    })
  }

  if (new Date() > record.expires_at) {
    await otpCodeRepository.destroy(record)
    throw new Error('رمز OTP منتهي الصلاحية')
  }

  const user = await userRepository.findById(record.user_id)
  if (!user) throw new Error('المستخدم غير موجود')

  await userRepository.activate(user)
  await otpCodeRepository.destroy(record)

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })

  await securityGuardService.recordSuccess({
    userId: user.id,
    action: 'REGISTER_OTP_VERIFIED',
    resourceType: 'auth',
    resourceId: user.id,
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent
  })

  return {
    token,
    user: new RegisterCitizenOutputDTO(user),
    role_code: 'CITIZEN',
    message: 'تم تفعيل الحساب بنجاح',
  }
}

async function verifyLoginOtp ({ session_id, otp }, clientMeta = {}) {
  const { error } = validateVerifyOtp({ session_id, otp })
  if (error) throw new Error(error.details.map(d => d.message).join(', '))

  const record = await otpCodeRepository.findBySessionId(session_id)
  if (!record) throw new Error('session_id غير صحيح')

  await securityGuardService.assertAccountNotLocked(record.user_id)

  if (record.otp !== otp) {
    await handleSecurityFailure({
      userId: record.user_id,
      action: 'LOGIN_OTP_FAILED',
      message: 'رمز OTP غير صحيح',
      clientMeta,
      resourceType: 'auth',
      resourceId: session_id
    })
  }

  if (new Date() > record.expires_at) {
    await otpCodeRepository.destroy(record)
    throw new Error('رمز OTP منتهي الصلاحية')
  }

  const user = await userRepository.findById(record.user_id)
  if (!user) throw new Error('المستخدم غير موجود')

  await otpCodeRepository.destroy(record)

  const roleAssign = await userRoleAssignmentRepository.findActiveRolesByUserId(
    user.id
  )

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })

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
    roles: roleAssign.map(r => r.organization_department_roles_id),
    token,
  }
}

async function registerDeviceToken (userId, payload) {
  const { error } = validateDeviceToken(payload)

  if (error) {
    throw new Error(error.details.map(d => d.message).join(', '))
  }

  const { fcm_token, platform, device_id } = payload

  const existingToken = await userDeviceTokenRepository.findByFcmToken(fcm_token)

  if (existingToken) {
    await userDeviceTokenRepository.update(existingToken, {
      user_id: userId,
      platform: platform || existingToken.platform,
      device_id: device_id || existingToken.device_id,
      is_active: true
    })

    return existingToken
  }

  return userDeviceTokenRepository.create({
    user_id: userId,
    fcm_token,
    platform: platform || null,
    device_id: device_id || null,
    is_active: true
  })
}

module.exports = {
  registerEmployee,
  registerCitizen,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
  registerDeviceToken,
}
