'use strict'
const orgDeptRolesClient = require('../../../core/shared/clients/organization/orgDeptRolesClient')

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const userRepository = require('../repositories/userRepository')
const otpCodeRepository = require('../repositories/otpCodeRepository')
const orgDeptRoleRepository = require('../repositories/orgDeptRoleRepository')
const userRoleAssignmentRepository = require('../repositories/userRoleAssignmentRepository')

const {
  validateRegisterEmp,
  validateRegisterCitizen,
  validateLogin,
  validateVerifyOtp,
} = require('../validations/authValidations')

const { RegisterCitizenInputDTO } = require('../dto/RegisterCitizenInputDTO')
const { RegisterCitizenOutputDTO } = require('../dto/RegisterCitizenOutputDTO')
const { LoginInputDTO } = require('../dto/LoginInputDTO')
const { LoginOutputDTO } = require('../dto/LoginOutputDTO')

const { sendSms } = require('./smsService')

const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key'
const OTP_TTL_MINUTES = 5

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function saveAndSendOtp(userId, phone) {
  await otpCodeRepository.destroyByUserId(userId)

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

  await sendSms(phone, `رمز التحقق : ${otp}\nصالح لمدة ${OTP_TTL_MINUTES} دقائق فقط.`)
  return session_id
}

// ================== REGISTER EMPLOYEE (Tech team only) ===================
async function registerEmployee(userData) {
  const { error } = validateRegisterEmp(userData)
  if (error) throw new Error(error.details.map(d => d.message).join(' | '))

  const existingEmail = await userRepository.findByEmail(userData.email)
  if (existingEmail) throw new Error('البريد الإلكتروني مستخدم مسبقاً، الرجاء استخدام بريد آخر')

  const existingUserName = await userRepository.findByUserName(userData.userName)
  if (existingUserName) throw new Error('اسم المستخدم مستخدم مسبقاً، الرجاء اختيار اسم آخر')

  const orgDeptRole = await orgDeptRoleRepository.findByOrgDeptRole(
    userData.organization_id,
    userData.department_id,
    userData.role_id
  )

  if (!orgDeptRole) {
    throw new Error(
      'لا يوجد دور مرتبط بهذه المؤسسة والقسم. تأكد من إنشاء (organization_department_role) أولاً'
    )
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10)

  const user = await userRepository.create({
    userName: userData.userName,
    email: userData.email,
    phone_number: userData.phone_number,
    password: hashedPassword,
    is_active: true,
  })

  await userRoleAssignmentRepository.create({
    user_id: user.id,
    organization_department_roles_id: orgDeptRole.id,
  })

  return {
    userName: userData.userName,
    password: userData.password,
    organization_department_roles_id: orgDeptRole.id,
    message: 'تم إنشاء حساب الموظف بنجاح. سلّم بيانات الدخول للموظف.',
  }
}

// ================== REGISTER CITIZEN — Step 1 ===================
async function registerCitizen(userData) {

  const sequelize = userRepository.getSequelize()

  const transaction = await sequelize.transaction()

  try {

    const { error } = validateRegisterCitizen(userData)

    if (error) {
      throw new Error(error.details.map(d => d.message).join(', '))
    }

    const conflictingUsers = await userRepository.findConflictingByEmailOrUserName(
      userData.email,
      userData.userName,
      { transaction }
    )

    for (const existing of conflictingUsers) {
      if (existing.is_active) {
        if (existing.email === userData.email) {
          throw new Error('البريد الإلكتروني مستخدم مسبقاً، الرجاء استخدام بريد آخر')
        }
        throw new Error('اسم المستخدم مستخدم مسبقاً، الرجاء اختيار اسم آخر')
      }

      await otpCodeRepository.destroyByUserId(existing.id, { transaction })
      await userRepository.destroyInstance(existing, { transaction })
    }

    const orgDeptRole = await orgDeptRoleRepository.findByCamundaGroupKey(
      'CITIZEN',
      { transaction }
    )

    if (!orgDeptRole) {
      throw new Error('دور المواطن (CITIZEN) غير معرّف في النظام. يرجى التواصل مع الدعم الفني.')
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
      throw new Error('لا يوجد رقم هاتف مرتبط بهذا الحساب. يرجى التواصل مع الدعم الفني')
    }

    const session_id = await saveAndSendOtp(user.id, user.phone_number)

    return {
      session_id,
      message: `تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال ${OTP_TTL_MINUTES} دقائق.`,
    }

  } catch (error) {

    if (!transaction.finished) {
      await transaction.rollback()
    }

    throw error
  }
}

// ================== LOGIN — Step 1 ===================
async function login(userData) {
  const { error } = validateLogin(userData)
  if (error) throw new Error(error.details.map(d => d.message).join(', '))

  const inputDTO = new LoginInputDTO(userData)

  const user = await userRepository.findByUserName(inputDTO.userName)
  if (!user) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')

  const isValid = await bcrypt.compare(inputDTO.password, user.password)
  if (!isValid) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة')

  if (!user.is_active) throw new Error('الحساب غير مفعّل. يرجى إكمال عملية التحقق أو التواصل مع الدعم الفني')
  if (!user.phone_number) throw new Error('لا يوجد رقم هاتف مرتبط بهذا الحساب. يرجى التواصل مع الدعم الفني')

  const session_id = await saveAndSendOtp(user.id, user.phone_number)

  return {
    session_id,
    message: `تم إرسال رمز التحقق على رقم الموبايل. أدخله خلال ${OTP_TTL_MINUTES} دقائق.`,
  }
}

// ================== VERIFY REGISTER OTP — Step 2 ===================
async function verifyRegisterOtp({ session_id, otp }) {
  const { error } = validateVerifyOtp({ session_id, otp })
  if (error) throw new Error(error.details.map(d => d.message).join(', '))

  const record = await otpCodeRepository.findBySessionId(session_id)
  if (!record) throw new Error('جلسة التحقق غير صالحة أو منتهية. يرجى طلب رمز تحقق جديد')

  if (new Date() > record.expires_at) {
    await otpCodeRepository.destroyInstance(record)
    throw new Error(`انتهت صلاحية رمز التحقق (مدة الصلاحية ${OTP_TTL_MINUTES} دقائق). يرجى طلب رمز تحقق جديد`)
  }

  if (record.otp !== otp) {
    throw new Error('رمز التحقق غير صحيح. يرجى التأكد من الرمز المرسل إلى رقم هاتفك والمحاولة مرة أخرى')
  }

  const user = await userRepository.updateById(record.user_id, { is_active: true })
  if (!user) throw new Error('الحساب غير موجود. ربما تم حذفه. يرجى التواصل مع الدعم الفني')

  await otpCodeRepository.destroyInstance(record)

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })

  return {
    token,
    user: new RegisterCitizenOutputDTO(user),
    role_code: 'CITIZEN',
    message: 'تم تفعيل الحساب بنجاح',
  }
}

// ================== VERIFY LOGIN OTP — Step 2 ===================
async function verifyLoginOtp({ session_id, otp }) {
  const { error } = validateVerifyOtp({ session_id, otp })
  if (error) throw new Error(error.details.map(d => d.message).join(', '))

  const record = await otpCodeRepository.findBySessionId(session_id)
  if (!record) throw new Error('جلسة التحقق غير صالحة أو منتهية. يرجى تسجيل الدخول مرة أخرى لإرسال رمز تحقق جديد')

  if (new Date() > record.expires_at) {
    await otpCodeRepository.destroyInstance(record)
    throw new Error(`انتهت صلاحية رمز التحقق (مدة الصلاحية ${OTP_TTL_MINUTES} دقائق). يرجى تسجيل الدخول مرة أخرى لإرسال رمز تحقق جديد`)
  }

  if (record.otp !== otp) {
    throw new Error('رمز التحقق غير صحيح. يرجى التأكد من الرمز المرسل إلى رقم هاتفك والمحاولة مرة أخرى')
  }

  const user = await userRepository.findById(record.user_id)
  if (!user) throw new Error('الحساب غير موجود. ربما تم حذفه. يرجى التواصل مع الدعم الفني')

  await otpCodeRepository.destroyInstance(record)

  const roleAssign = await userRoleAssignmentRepository.findRoleIdsByUserId(user.id)

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })

  return {
    user: new LoginOutputDTO(user),
    roles: roleAssign.map(r => r.organization_department_roles_id),
    token,
  }
}

module.exports = {
  registerEmployee,
  registerCitizen,
  verifyRegisterOtp,
  login,
  verifyLoginOtp,
}
