'use strict'
const {
  User,
  OtpCode,
  OrgDeptRole,
  UserRoleAssignment,
  Role,
} = require('../../../entities')
const orgDeptRoleRepository = require('../repositories/orgDeptRoleRepository')

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
const OTP_TTL_MINUTES = 5

function generateOtp () {
  return '123456'
}

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

async function saveAndSendOtp (userId, phone) {
  await otpCodeRepository.deleteByUserId(userId)

  const otp = generateOtp()
  const session_id = uuidv4()

  const expires_at = new Date(
    Date.now() + OTP_TTL_MINUTES * 60 * 1000
  )

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

// ================== REGISTER EMPLOYEE ==================

async function registerEmployee (userData) {
  const { error } = validateRegisterEmp(userData)

  if (error) {
    throw new Error(
      error.details.map(d => d.message).join(' | ')
    )
  }

  const existingEmail = await userRepository.findByEmail(userData.email)

  if (existingEmail) {
    throw new Error(
      'البريد الإلكتروني مستخدم مسبقاً، الرجاء استخدام بريد آخر'
    )
  }

  const existingUserName = await userRepository.findByUserName(
    userData.userName
  )

  if (existingUserName) {
    throw new Error(
      'اسم المستخدم مستخدم مسبقاً، الرجاء اختيار اسم آخر'
    )
  }

  const orgDeptRole =
    await orgDeptRoleRepository.findByOrgDeptRole(
      userData.organization_id,
      userData.department_id,
      userData.role_id
    )

  if (!orgDeptRole) {
    throw new Error(
      'لا يوجد دور مرتبط بهذه المؤسسة والقسم. تأكد من إنشاء organization_department_role أولاً'
    )
  }

  const hashedPassword = await bcrypt.hash(
    crypto.randomBytes(32).toString('hex'),
    10
  )

  const pinHash = await hashPin(userData.pin)

  const publicKey = validatePublicKeyPem(
    userData.public_key
  )

  const keyFingerprint =
    computeKeyFingerprint(publicKey)

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

// ================== REGISTER CITIZEN ==================


async function registerCitizen(userData) {

  // const sequelize = User.sequelize

  // const transaction = await sequelize.transaction()

  // try {

  //   const { error } = validateRegisterCitizen(userData)

  //   if (error) {
  //     throw new Error(error.details.map(d => d.message).join(', '))
  //   }

  //   const existingUser = await User.findOne({
  //     where: { email: userData.email },
  //     transaction
  //   })

  //   if (existingUser) {
  //     throw new Error('Email already exists')
  //   }

  //   const orgDeptRole = await OrgDeptRole.findOne({
  //     where: {
  //       camunda_group_key: 'CITIZEN'
  //     },
  //     transaction
  //   })

  //   if (!orgDeptRole) {
  //     throw new Error('CITIZEN role not found')
  //   }

  //   const hashedPassword = await bcrypt.hash(userData.password, 10)

  //   const inputUserDTO = new RegisterCitizenInputDTO({
  //     ...userData,
  //     password: hashedPassword
  //   })

  //   const user = await User.create(
  //     { ...inputUserDTO, is_active: false },
  //     { transaction }
  //   )

  //   await UserRoleAssignment.create({
  //     user_id: user.id,
  //     organization_department_roles_id: orgDeptRole.id
  //   }, { transaction })

  //   await transaction.commit()

  //   if (!user.phone_number) {
  //     throw new Error('لا يوجد رقم هاتف مرتبط بهذا الحساب')
  //   }

  //   const session_id = await saveAndSendOtp(user.id, user.phone_number)

  //   return {
  //     session_id,
  //     message: 'تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال دقيقتين.',
  //   }

  // } catch (error) {

  //   if (!transaction.finished) {
  //     await transaction.rollback()
  //   }

  //   throw error
  // }
  
  const sequelize = User.sequelize

  const transaction = await sequelize.transaction()

  try {

    const { error } = validateRegisterCitizen(userData)

    if (error) {
      throw new Error(error.details.map(d => d.message).join(', '))
    }

    const existingUser = await User.findOne({
      where: { email: userData.email },
      transaction
    })

    if (existingUser) {
      throw new Error('Email already exists')
    }

    const orgDeptRole = await OrgDeptRole.findOne({
      where: {
        camunda_group_key: 'CITIZEN'
      },
      transaction
    })

    if (!orgDeptRole) {
      throw new Error('CITIZEN role not found')
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10)

    const inputUserDTO = new RegisterCitizenInputDTO({
      ...userData,
      password: hashedPassword
    })

    const user = await User.create(
      { ...inputUserDTO },
      { transaction }
    )

    await UserRoleAssignment.create({
      user_id: user.id,
      organization_department_roles_id: orgDeptRole.id
    }, { transaction })

    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    await transaction.commit()

    return {
      token,
      user: new RegisterCitizenOutputDTO(user),
      role_code: 'CITIZEN'
    }

  } catch (error) {

    await transaction.rollback()

    throw error
  }
}

// ================== LOGIN ==================

async function login(userData) {
  // const { error } = validateLogin(userData)
  // if (error) throw new Error(error.details.map(d => d.message).join(', '))

  // const inputDTO = new LoginInputDTO(userData)

  // const user = await User.findOne({ where: { userName: inputDTO.userName } })
  // if (!user) throw new Error('Invalid userName or password')

  // const isValid = await bcrypt.compare(inputDTO.password, user.password)
  // if (!isValid) throw new Error('Invalid userName or password')

  // if (!user.is_active) throw new Error('الحساب غير مفعّل. سجّل من جديد أو تواصل مع الدعم')
  // if (!user.phone_number) throw new Error('لا يوجد رقم هاتف مرتبط بهذا الحساب')

  // const session_id = await saveAndSendOtp(user.id, user.phone_number)

  // return {
  //   session_id,
  //   message: 'تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال دقيقتين.',
  // }
    const { error } = validateLogin(userData)
  if (error) {
    throw new Error(error.details.map(d => d.message).join(', '))
  }

  const inputDTO = new LoginInputDTO(userData)

  const user = await User.findOne({
    where: { userName: inputDTO.userName }
  })

  if (!user) {
    throw new Error('Invalid userName or password')
  }

  const isValid = await bcrypt.compare(inputDTO.password, user.password)
  if (!isValid) {
    throw new Error('Invalid userName or password')
  }

  const roleAssign = await UserRoleAssignment.findAll({
    where: { user_id: user.id },
    attributes: ['organization_department_roles_id']
  })

  if (!roleAssign.length) {
    throw new Error('User has no roles')
  }

  const roleIds = roleAssign.map(r => r.organization_department_roles_id)

  const token = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  return {
    user: new LoginOutputDTO(user),
    roles: roleIds,
    token
  }
}

// ================== VERIFY REGISTER OTP ==================

async function verifyRegisterOtp (
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
      'جلسة التحقق غير صالحة أو منتهية. يرجى طلب رمز تحقق جديد'
    )
  }

  if (new Date() > record.expires_at) {
    await otpCodeRepository.destroyInstance(record)

    throw new Error(
      `انتهت صلاحية رمز التحقق (مدة الصلاحية ${OTP_TTL_MINUTES} دقائق). يرجى طلب رمز تحقق جديد`
    )
  }

  if (record.otp !== otp) {
    await handleSecurityFailure({
      userId: record.user_id,
      action: 'REGISTER_OTP_FAILED',
      message:
        'رمز التحقق غير صحيح',
      clientMeta,
      resourceType: 'auth',
      resourceId: record.user_id
    })
  }

  const user =
    await userRepository.updateById(
      record.user_id,
      { is_active: true }
    )

  if (!user) {
    throw new Error(
      'الحساب غير موجود. ربما تم حذفه. يرجى التواصل مع الدعم الفني'
    )
  }

  await otpCodeRepository.destroyInstance(record)

  const token = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

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
    await otpCodeRepository.destroyInstance(record)

    throw new Error(
      `انتهت صلاحية رمز التحقق (مدة الصلاحية ${OTP_TTL_MINUTES} دقائق). يرجى تسجيل الدخول مرة أخرى لإرسال رمز تحقق جديد`
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
    await userRoleAssignmentRepository.findRoleIdsByUserId(
      user.id
    )

  const token = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: '30d' }
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
    roles: roleAssign.map(
      r => r.organization_department_roles_id
    ),
    token,
  }
}

// ================== DEVICE TOKEN ==================

async function registerDeviceToken (
  userId,
  payload
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
