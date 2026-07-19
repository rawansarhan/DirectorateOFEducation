'use strict'

const orgDeptRolesClient = require('../../../../core/shared/clients/organization/orgDeptRolesClient')

const bcrypt = require('bcryptjs')

const userRepository = require('../../shared/repositories/userRepository')
const otpCodeRepository = require('../../shared/repositories/otpCodeRepository')
const userRoleAssignmentRepository = require('../../shared/repositories/userRoleAssignmentRepository')
const userKeyRepository = require('../../shared/repositories/userKeyRepository')
const securityGuardService = require('../../../../core/security/securityGuardService')
const tokenService = require('../../shared/services/tokenService')

const {
  validateRegisterEmp,
  validateRegisterCitizen,
  validateVerifyOtp,
} = require('../validations/registerValidations')

const { RegisterCitizenInputDTO } = require('../dto/RegisterCitizenInputDTO')
const { RegisterCitizenOutputDTO } = require('../dto/RegisterCitizenOutputDTO')

const {
  computeKeyFingerprint,
  hashPin,
  validatePrivateKeyPem,
  assertPrivatePublicKeyPair
} = require('../../shared/services/cryptoAuthService')

const {
  encryptPrivateKeyPem,
  decryptPrivateKeyPem
} = require('../../../../core/crypto/employeeKeyCrypto')

const {
  OTP_TTL_MINUTES,
  handleSecurityFailure,
  saveAndSendOtp,
} = require('../../shared/services/otpAuthHelpers')


// ================== REGISTER EMPLOYEE ==================

async function registerEmployee (userData) {
  const { error, value } = validateRegisterEmp(userData)

  if (error) {
    throw new Error(
      error.details.map(d => d.message).join(' | ')
    )
  }

  const data = value

  const existingEmail = await userRepository.findByEmail(data.email)

  if (existingEmail) {
    throw new Error(
      'البريد الإلكتروني مستخدم مسبقاً، الرجاء استخدام بريد آخر'
    )
  }

  const existingUserName = await userRepository.findByUserName(
    data.userName
  )

  if (existingUserName) {
    throw new Error(
      'اسم المستخدم مستخدم مسبقاً، الرجاء اختيار اسم آخر'
    )
  }

  const existingNationalId = await userRepository.findByNationalId(
    data.national_id
  )

  if (existingNationalId) {
    throw new Error('الرقم الوطني مسجّل مسبقاً')
  }

  const orgDeptRole =
    await orgDeptRolesClient.findOrgDeptRole({
      organization_id: data.organization_id,
      department_id: data.department_id,
      role_id: data.role_id
    })

  if (!orgDeptRole) {
    throw new Error(
      'لا يوجد دور مرتبط بهذه المؤسسة والقسم. تأكد من إنشاء organization_department_role أولاً'
    )
  }

  const hashedPassword = await bcrypt.hash(
    data.password,
    10
  )

  const pinHash = await hashPin(data.pin)

  const publicKeyPem = data.public_key

  if (data.private_key) {
    const privateKeyPem = validatePrivateKeyPem(data.private_key)
    assertPrivatePublicKeyPair(privateKeyPem, publicKeyPem)

    const encryptedPrivateKey = encryptPrivateKeyPem(
      privateKeyPem,
      data.pin,
      computeKeyFingerprint(publicKeyPem)
    )

    const decryptedCheck = decryptPrivateKeyPem(
      {
        meta: encryptedPrivateKey.meta,
        ciphertextBase64: encryptedPrivateKey.ciphertext
      },
      data.pin
    )

    if (decryptedCheck !== privateKeyPem) {
      throw new Error('فشل التحقق من تشفير المفتاح الخاص')
    }
  }

  const keyFingerprint = computeKeyFingerprint(publicKeyPem)

  const user = await userRepository.create({
    userName: data.userName,
    email: data.email,
    phone_number: data.phone_number,
    first_name: data.first_name,
    last_name: data.last_name,
    father_name: data.father_name,
    mother_name: data.mother_name,
    national_id: data.national_id,
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
    public_key: publicKeyPem,
    key_fingerprint: keyFingerprint,
    algorithm: 'ed25519',
    is_active: true,
  })

  return {
    userName: data.userName,
    first_name: user.first_name,
    last_name: user.last_name,
    father_name: user.father_name,
    mother_name: user.mother_name,
    national_id: user.national_id,
    key_fingerprint: keyFingerprint,
    public_key: publicKeyPem,
    organization_department_roles_id: orgDeptRole.id
  }
}
// //////////////////////////////////////////////////
// const jwt = require('jsonwebtoken')
// const { OrgDeptRole , User , UserRoleAssignment } = require('../../../entities')
// const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key'

// // ================== REGISTER CITIZEN ==================
// async function registerCitizen(userData) {

//   const sequelize = User.sequelize

//   const transaction = await sequelize.transaction()

//   try {

//     const { error } = validateRegisterCitizen(userData)

//     if (error) {
//       throw new Error(error.details.map(d => d.message).join(', '))
//     }

//     const existingUser = await User.findOne({
//       where: { email: userData.email },
//       transaction
//     })

//     if (existingUser) {
//       throw new Error('Email already exists')
//     }

//     const orgDeptRole = await OrgDeptRole.findOne({
//       where: {
//         camunda_group_key: 'CITIZEN'
//       },
//       transaction
//     })

//     if (!orgDeptRole) {
//       throw new Error('CITIZEN role not found')
//     }

//     const hashedPassword = await bcrypt.hash(userData.password, 10)

//     const inputUserDTO = new RegisterCitizenInputDTO({
//       ...userData,
//       password: hashedPassword
//     })

//     const user = await User.create(
//       { ...inputUserDTO },
//       { transaction }
//     )

//     await UserRoleAssignment.create({
//       user_id: user.id,
//       organization_department_roles_id: orgDeptRole.id
//     }, { transaction })

//     const token = jwt.sign(
//       { id: user.id },
//       JWT_SECRET,
//       { expiresIn: '30d' }
//     )

//     await transaction.commit()

//     return {
//       token,
//       user: new RegisterCitizenOutputDTO(user),
//       role_code: 'CITIZEN'
//     }

//   } catch (error) {

//     await transaction.rollback()

//     throw error
//   }
// }
async function registerCitizen (userData) {
  const sequelize = userRepository.getSequelize()

  const transaction = await sequelize.transaction()

  try {
    const { error } =
      validateRegisterCitizen(userData)

    if (error) {
      throw new Error(
        error.details.map(d => d.message).join(', ')
      )
    }

    const conflictingUsers =
      await userRepository.findConflictingByEmailOrUserName(
        userData.email,
        userData.userName,
        { transaction }
      )

    for (const existing of conflictingUsers) {
      if (existing.is_active) {
        if (existing.email === userData.email) {
          throw new Error(
            'البريد الإلكتروني مستخدم مسبقاً، الرجاء استخدام بريد آخر'
          )
        }

        throw new Error(
          'اسم المستخدم مستخدم مسبقاً، الرجاء اختيار اسم آخر'
        )
      }

      await otpCodeRepository.destroyByUserId(
        existing.id,
        { transaction }
      )

      await userRepository.destroyInstance(
        existing,
        { transaction }
      )
    }

    const orgDeptRole =
      await orgDeptRolesClient.getCitizenRole()

    if (!orgDeptRole) {
      throw new Error(
        'دور المواطن (CITIZEN) غير معرّف في النظام. يرجى التواصل مع الدعم الفني.'
      )
    }

    const hashedPassword = await bcrypt.hash(
      userData.password,
      10
    )

    const inputUserDTO =
      new RegisterCitizenInputDTO({
        ...userData,
        password: hashedPassword
      })

    const user = await userRepository.create(
      {
        ...inputUserDTO,
        is_active: false
      },
      { transaction }
    )

    await userRoleAssignmentRepository.create(
      {
        user_id: user.id,
        organization_department_roles_id:
          orgDeptRole.id
      },
      { transaction }
    )

    await transaction.commit()

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

    return {
      session_id,
      message:
        `تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال ${OTP_TTL_MINUTES} دقائق.`,
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
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

  const { accessToken, refreshToken } = await tokenService.issueTokens(
    user.id,
    clientMeta
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
    token: accessToken,
    refreshToken,
    user: new RegisterCitizenOutputDTO(user),
    role_code: 'CITIZEN',
    message: 'تم تفعيل الحساب بنجاح',
  }
}

module.exports = {
  registerEmployee,
  registerCitizen,
  verifyRegisterOtp,
}
