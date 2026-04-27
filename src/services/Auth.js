const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
// const nodemailer = require('nodemailer')
const { v4: uuidv4 } = require('uuid') // ⬅️ استيراد UUID
const {
  User,
  Permission,
  OrgDeptRole,
  UserRoleAssignment,
  Role,
  RolePermission
} = require('../entities')


const {
  validateRegisterEmp,
  validateRegisterCitizen,
  validateLogin
  // ValidateVerifyOtp // ⬅️ استيراد للتحقق من OTP
} = require('../validations/authValidations')

const { RegisterCitizenInputDTO } = require('../dto/RegisterCitizenInputDTO')
const { RegisterCitizenOutputDTO } = require('../dto/RegisterCitizenOutputDTO')

const { LoginInputDTO } = require('../dto/LoginInputDTO')
const { LoginOutputDTO } = require('../dto/LoginOutputDTO')

const { RegisterEmpInputDTO } = require('../dto/RegisterEmpInputDTO')
const { RegisterEmpOutputDTO } = require('../dto/RegisterEmpOutputDTO')

// const OtpRepository = require('../repositories/OtpRepository')

const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key'


// إعداد البريد لإرسال OTP
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS // App Password
//   }
// })

// ================== دالة لإرسال OTP عبر البريد ==================
// async function sendOtpEmail (email, otp) {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'رمز التحقق OTP',
//     text: `رمز التحقق الخاص بك هو: ${otp}\nصالح لمدة 5 دقائق فقط.`
//   }

//   await transporter.sendMail(mailOptions)
// }

// ================== REGISTER EMPLOYEE ===================
async function registerEmployee(userData) {
  // 1. validation
  const { error } = validateRegisterEmp(userData)

  if (error) {
    throw new Error(error.details.map(d => d.message).join(' | '))
  }

  // 2. check email
  const existingUser = await User.findOne({
    where: { email: userData.email }
  })

  if (existingUser) {
    throw new Error('Email already exists')
  }

  // 3. check roles array
  if (
    !Array.isArray(userData.organization_department_role_ids) ||
    userData.organization_department_role_ids.length === 0
  ) {
    throw new Error('organization_department_role_ids is required')
  }

  // 4. validate roles exist
  const roles = await OrgDeptRole.findAll({
    where: {
      id: userData.organization_department_role_ids
    }
  })

  if (roles.length !== userData.organization_department_role_ids.length) {
    throw new Error('One or more roles are invalid')
  }

  // 5. hash password
  const hashedPassword = await bcrypt.hash(userData.password, 10)

  // 6. create user (IMPORTANT FIX)
  const user = await User.create({
    userName: userData.userName,
    email: userData.email,
    phone_number: userData.phone_number,
    password: hashedPassword,
    is_active: userData.is_active ?? true
  })

  // 7. create role assignments
  const assignments = userData.organization_department_role_ids.map(roleId => ({
    user_id: user.id,
    organization_department_roles_id: roleId
  }))

  await UserRoleAssignment.bulkCreate(assignments)

  // 8. token
  const token = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  return {
    token,
    user,
  }
}

// ================== REGISTER CITIZEN ===================
async function registerCitizen(userData) {
  const { error } = validateRegisterCitizen(userData)
  if (error) {
    throw new Error(error.details.map(d => d.message).join(', '))
  }

  const existingUser = await User.findOne({
    where: { email: userData.email }
  })
  if (existingUser) {
    throw new Error('Email already exists')
  }

  // ✅ التصحيح هنا
  const orgDeptRole = await OrgDeptRole.findOne({
    include: [
      {
        model: Role,
        as: 'role',
        where: { code: 'CITIZEN' }
      }
    ]
  })

  if (!orgDeptRole) {
    throw new Error('CITIZEN role not found')
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10)

  const inputUserDTO = new RegisterCitizenInputDTO({
    ...userData,
    password: hashedPassword
  })

  const user = await User.create({ ...inputUserDTO })

  const roleAssign = await UserRoleAssignment.create({
    user_id: user.id,
    organization_department_roles_id: orgDeptRole.id
  })

  const token = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  return {
    token,
    user: new RegisterCitizenOutputDTO(user),
    role_code: CITIZEN
  }
}
//=================== login  ================//
async function login(userData) {
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

// ================== Login Step 1: Send OTP ===================
// async function loginStep1 (userData) {
//   const { error } = ValidateLoginUser(userData)
//   if (error) {
//     console.log('Validation error details:', error.details)
//     throw new Error(error.details.map(d => d.message).join(', '))
//   }

//   const inputLoginDTO = new UserLoginInputDTO(userData)

//   const user = await User.findOne({ where: { email: inputLoginDTO.email } })
//   if (!user) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')

//   const isMatch = await bcrypt.compare(inputLoginDTO.password, user.password)
//   if (!isMatch) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')

//   const otp = Math.floor(100000 + Math.random() * 900000).toString()
//   const session_id = uuidv4()

//   // حفظ الـ OTP مع البريد الإلكتروني لسهولة التحقق لاحقًا
//   await OtpRepository.saveOtp(session_id, { otp, email: user.email })

//   await sendOtpEmail(user.email, otp)

//   return {
//     message: 'تم إرسال رمز التحقق OTP على بريدك الإلكتروني',
//     session_id
//   }
// }

// ================== Login Step 2: Verify OTP ===================
// async function verifyOtpStep2 (otpData) {
//   const { error } = ValidateVerifyOtp(otpData)
//   if (error) {
//     const messages = error.details.map(d => d.message)
//     throw new Error(messages.join(', '))
//   }

//   const inputOtpDTO = new VerifyOtpInputDTO(otpData)

//   const otpRecord = await OtpRepository.verifyOtp(
//     inputOtpDTO.session_id,
//     inputOtpDTO.otp
//   )
//   if (!otpRecord || !otpRecord.email)
//     throw new Error('رمز OTP غير صحيح أو منتهي الصلاحية')

//   await OtpRepository.deleteOtp(inputOtpDTO.session_id)

//   const user = await User.findOne({ where: { email: otpRecord.email } })
//   if (!user) throw new Error('المستخدم غير موجود')

//   const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '90d' })

//   return {
//     user: new UserLoginOutputDTO(user),
//     token
//   }
// }

// async function getAllPermission(role_id = 2) {
//   const permissions = await RolePermission.findAll({
//     where: { role_id },
//     include: [
//       {
//         model: Permission,
//         as: 'permissions',  
//         attributes: ['name']
//       }
//     ],
//      include: [
//       {
//         model: Permission,
//         as: 'orgDeptRole',  
//         attributes: ['name']
//       }
//     ],

//   });

//   if (!permissions || permissions.length === 0) {
//     return { message: 'No permissions found' };
//   }

//   return permissions ;
// }
module.exports = {
  registerEmployee,
  registerCitizen,
  login,
}
