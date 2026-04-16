const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const { v4: uuidv4 } = require('uuid') // ⬅️ استيراد UUID
const {
  User,
  Employee,
  Citizen,
  UserPermission,
  RolePermission,
  Permission
} = require('../entities')

const {
  UserRegisterInputDTO,
  UserLoginInputDTO,
  SendOtpInputDTO,
  VerifyOtpInputDTO
} = require('../dto/UserInputDTO')

const {
  UserLoginOutputDTO,
  UserRegisterOutputDTO
} = require('../dto/UserOutputDTO')

const {
  ValidateLoginUser,
  ValidateRegisterCitizen,
  ValidateRegisterEmployee,
  ValidateVerifyOtp // ⬅️ استيراد للتحقق من OTP
} = require('../validations/authValidation')

const { EmployeeInputDTO } = require('../dto/EmployeeInputDTO')
const { EmployeeOutputDTO } = require('../dto/EmployeeOutputDTO')

const { CitizenInputDTO } = require('../dto/CitizenInputDTO')
const { CitizenOutputDTO } = require('../dto/CitizenOutputDTO')

const { UserPermissionInputDTO } = require('../dto/UserPermissionInputDTO')
const { UserPermissionOutputDTO } = require('../dto/UserPermissionOutputDTO')

const OtpRepository = require('../repositories/OtpRepository')

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key'

// إعداد البريد لإرسال OTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // App Password
  }
})

// ================== دالة لإرسال OTP عبر البريد ==================
async function sendOtpEmail (email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'رمز التحقق OTP',
    text: `رمز التحقق الخاص بك هو: ${otp}\nصالح لمدة 5 دقائق فقط.`
  }

  await transporter.sendMail(mailOptions)
}

// ================== REGISTER EMPLOYEE ===================
async function registerEmployee (userData) {
  // التحقق من صحة البيانات
  const { error } = ValidateRegisterEmployee(userData)
  if (error) {
    const messages = error.details.map(d => d.message)
    throw new Error(messages.join(', '))
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10)
  const role_id = 2

  const inputUserDTO = new UserRegisterInputDTO({
    ...userData,
    password: hashedPassword,
    role_id: role_id
  })
  const user = await User.create({ ...inputUserDTO })

  const inputEmpDTO = new EmployeeInputDTO({
    user_id: user.id,
    government_entity: userData.government_entity
  })
  const employee = await Employee.create({ ...inputEmpDTO })

  const permissionIds = Array.isArray(userData.permission_id)
    ? userData.permission_id
    : [userData.permission_id]

  const userPermissionsData = permissionIds.map(id => ({
    user_id: user.id,
    permission_id: id
  }))

  const userPermissions = await UserPermission.bulkCreate(userPermissionsData)

  return {
    user: new UserRegisterOutputDTO(user),
    newEmployee: new EmployeeOutputDTO(employee)
  }
}

// ================== REGISTER CITIZEN ===================
async function registerCitizen (userData) {
  const { error } = ValidateRegisterCitizen(userData)
  if (error) {
    const messages = error.details.map(d => d.message)
    throw new Error(messages.join(', '))
  }

  const role_id = 3
  const hashedPassword = await bcrypt.hash(userData.password, 10)

  const inputUserDTO = new UserRegisterInputDTO({
    ...userData,
    password: hashedPassword,
    role_id: role_id
  })
  const user = await User.create({ ...inputUserDTO })

  const inputCitizenDTO = new CitizenInputDTO({
    user_id: user.id
  })
   await Citizen.create({ ...inputCitizenDTO })

  const rolePermissions = await RolePermission.findAll({
    where: { role_id: 3 }
  })

  const userPermissionsData = rolePermissions.map(rp => ({
    user_id: user.id,
    permission_id: rp.permission_id
  }))

  const userPermissions = await UserPermission.bulkCreate(userPermissionsData)
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })

  return {
    user: new UserRegisterOutputDTO(user),
    token
  }
}
//=================== login admin and employee ================//
async function login (userData) {
  const { error } = ValidateLoginUser(userData)
  if (error) {
    const messages = error.details.map(d => d.message)
    throw new Error(messages.join(', '))
  }

  const inputDTO = new UserLoginInputDTO(userData)

  const user = await User.findOne({ where: { email: inputDTO.email } })
  if (!user) {
    throw new Error('Invalid email or password')
  }

  const isValid = await bcrypt.compare(inputDTO.password, user.password)
  if (!isValid) {
    throw new Error('Invalid email or password')
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '30d'
  })

  const outputDTO = new UserLoginOutputDTO(user)

  return {
    user: outputDTO,
    token
  }
}

// ================== Login Step 1: Send OTP ===================
async function loginStep1 (userData) {
  const { error } = ValidateLoginUser(userData)
  if (error) {
    console.log('Validation error details:', error.details)
    throw new Error(error.details.map(d => d.message).join(', '))
  }

  const inputLoginDTO = new UserLoginInputDTO(userData)

  const user = await User.findOne({ where: { email: inputLoginDTO.email } })
  if (!user) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')

  const isMatch = await bcrypt.compare(inputLoginDTO.password, user.password)
  if (!isMatch) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const session_id = uuidv4()

  // حفظ الـ OTP مع البريد الإلكتروني لسهولة التحقق لاحقًا
  await OtpRepository.saveOtp(session_id, { otp, email: user.email })

  await sendOtpEmail(user.email, otp)

  return {
    message: 'تم إرسال رمز التحقق OTP على بريدك الإلكتروني',
    session_id
  }
}

// ================== Login Step 2: Verify OTP ===================
async function verifyOtpStep2 (otpData) {
  const { error } = ValidateVerifyOtp(otpData)
  if (error) {
    const messages = error.details.map(d => d.message)
    throw new Error(messages.join(', '))
  }

  const inputOtpDTO = new VerifyOtpInputDTO(otpData)

  const otpRecord = await OtpRepository.verifyOtp(
    inputOtpDTO.session_id,
    inputOtpDTO.otp
  )
  if (!otpRecord || !otpRecord.email)
    throw new Error('رمز OTP غير صحيح أو منتهي الصلاحية')

  await OtpRepository.deleteOtp(inputOtpDTO.session_id)

  const user = await User.findOne({ where: { email: otpRecord.email } })
  if (!user) throw new Error('المستخدم غير موجود')

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '90d' })

  return {
    user: new UserLoginOutputDTO(user),
    token
  }
}

async function getAllPermission(role_id = 2) {
  const permissions = await RolePermission.findAll({
    where: { role_id },
    include: [
      {
        model: Permission,
        as: 'permissions', 
        attributes: ['name']
      }
    ]
  });

  if (!permissions || permissions.length === 0) {
    return { message: 'No permissions found' };
  }

  return permissions ;
}
module.exports = {
  registerEmployee,
  registerCitizen,
  loginStep1,
  verifyOtpStep2,
  login,
  getAllPermission
}
