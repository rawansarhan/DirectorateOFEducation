const Joi = require('joi')
const {
  validatePublicKeyPem,
  validatePrivateKeyPem,
  assertPrivatePublicKeyPair
} = require('../services/cryptoAuthService')

// ============================================
// رسائل عربية مشتركة لكل حقل
// ============================================
const userNameMessages = {
  'string.base': 'اسم المستخدم يجب أن يكون نصاً',
  'string.empty': 'اسم المستخدم مطلوب',
  'string.min': 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل',
  'string.max': 'اسم المستخدم يجب ألا يتجاوز 50 حرفاً',
  'string.pattern.base': 'اسم المستخدم يجب ألا يحتوي على فراغات',
  'any.required': 'اسم المستخدم مطلوب'
}

const emailMessages = {
  'string.base': 'البريد الإلكتروني يجب أن يكون نصاً',
  'string.empty': 'البريد الإلكتروني مطلوب',
  'string.email': 'صيغة البريد الإلكتروني غير صحيحة',
  'any.required': 'البريد الإلكتروني مطلوب'
}

const phoneMessages = {
  'string.base': 'رقم الهاتف يجب أن يكون نصاً',
  'string.empty': 'رقم الهاتف مطلوب',
  'string.pattern.base': 'رقم الهاتف يجب أن يبدأ بـ 09 ويتكون من 10 أرقام',
  'any.required': 'رقم الهاتف مطلوب'
}

const passwordMessages = {
  'string.base': 'كلمة المرور يجب أن تكون نصاً',
  'string.empty': 'كلمة المرور مطلوبة',
  'string.min': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
  'string.pattern.base': 'كلمة المرور يجب أن تحتوي على أحرف وأرقام',
  'any.required': 'كلمة المرور مطلوبة'
}

const idMessages = (label) => ({
  'number.base': `${label} يجب أن يكون رقماً`,
  'number.integer': `${label} يجب أن يكون رقماً صحيحاً`,
  'number.positive': `${label} يجب أن يكون رقماً موجباً`,
  'any.required': `${label} مطلوب`
})

const ARABIC_NAME_PATTERN = /^[\u0600-\u06FFa-zA-Z][\u0600-\u06FFa-zA-Z\s.'-]{1,49}$/

const personNameMessages = (label) => ({
  'string.base': `${label} يجب أن يكون نصاً`,
  'string.empty': `${label} مطلوب`,
  'string.min': `${label} يجب أن يكون حرفين على الأقل`,
  'string.max': `${label} يجب ألا يتجاوز 50 حرفاً`,
  'string.pattern.base': `${label} يجب أن يحتوي على أحرف عربية أو لاتينية فقط`,
  'any.required': `${label} مطلوب`
})

const nationalIdMessages = {
  'string.base': 'الرقم الوطني يجب أن يكون نصاً',
  'string.empty': 'الرقم الوطني مطلوب',
  'string.length': 'الرقم الوطني يجب أن يتكون من 11 رقماً',
  'string.pattern.base': 'الرقم الوطني يجب أن يحتوي على أرقام فقط',
  'any.required': 'الرقم الوطني مطلوب'
}

// =======================================
// validate register employee
// =======================================
function validateRegisterEmp (data) {
  const schema = Joi.object({
    first_name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(ARABIC_NAME_PATTERN)
      .required()
      .messages(personNameMessages('الاسم الأول')),

    last_name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(ARABIC_NAME_PATTERN)
      .required()
      .messages(personNameMessages('الاسم الأخير')),

    father_name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(ARABIC_NAME_PATTERN)
      .required()
      .messages(personNameMessages('اسم الأب')),

    mother_name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(ARABIC_NAME_PATTERN)
      .required()
      .messages(personNameMessages('اسم الأم')),

    national_id: Joi.string()
      .trim()
      .length(11)
      .pattern(/^\d{11}$/)
      .required()
      .messages(nationalIdMessages),

    userName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .pattern(/^\S+$/)
      .required()
      .messages(userNameMessages),

    email: Joi.string()
      .email()
      .lowercase()
      .required()
      .messages(emailMessages),

    phone_number: Joi.string()
      .pattern(/^09\d{8}$/)
      .required()
      .messages(phoneMessages),

    password: Joi.string()
      .min(6)
      .required()
      .messages(passwordMessages),

    pin: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.base': 'رمز PIN يجب أن يكون نصاً',
        'string.length': 'رمز PIN يجب أن يتكون من 6 أرقام',
        'string.pattern.base': 'رمز PIN يجب أن يحتوي على أرقام فقط',
        'any.required': 'رمز PIN مطلوب'
      }),

    confirm_pin: Joi.string()
      .valid(Joi.ref('pin'))
      .required()
      .messages({
        'any.only': 'confirm_pin يجب أن يطابق pin',
        'any.required': 'confirm_pin مطلوب'
      }),

    organization_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages(idMessages('معرّف المؤسسة')),

    department_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages(idMessages('معرّف القسم')),

    role_id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages(idMessages('معرّف الدور')),

    private_key: Joi.string()
      .trim()
      .optional()
      .messages({
        'string.base': 'المفتاح الخاص يجب أن يكون نصاً'
      }),

    public_key: Joi.string()
      .trim()
      .required()
      .messages({
        'string.base': 'المفتاح العام يجب أن يكون نصاً',
        'string.empty': 'المفتاح العام مطلوب',
        'any.required': 'المفتاح العام مطلوب'
      })
  }).messages({
    'object.unknown': 'الحقل {#label} غير مسموح به'
  })

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })

  if (error) {
    return { error, value: null }
  }

  try {
    value.public_key = validatePublicKeyPem(value.public_key)
  } catch (keyError) {
    return {
      error: {
        details: [{ message: keyError.message }]
      },
      value: null
    }
  }

  if (value.private_key) {
    try {
      validatePrivateKeyPem(value.private_key)
      assertPrivatePublicKeyPair(value.private_key, value.public_key)
    } catch (keyError) {
      return {
        error: {
          details: [{ message: keyError.message }]
        },
        value: null
      }
    }
  }

  return { error: null, value }
}

// ===========================================
// validate register citizen
// ===========================================
function validateRegisterCitizen (data) {
  const schema = Joi.object({
    userName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .pattern(/^\S+$/)
      .required()
      .messages(userNameMessages),

    email: Joi.string()
      .email()
      .lowercase()
      .required()
      .messages(emailMessages),

    phone_number: Joi.string()
      .pattern(/^09\d{8}$/)
      .required()
      .messages(phoneMessages),

    password: Joi.string()
      .min(6)
      .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
      .required()
      .messages(passwordMessages)
  }).messages({
    'object.unknown': 'الحقل {#label} غير مسموح به'
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

// ===========================================
// validate login
// ===========================================
function validateLogin (data) {
  const schema = Joi.object({
    userName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .required()
      .messages(userNameMessages),

    password: Joi.string()
      .min(6)
      .required()
      .messages(passwordMessages)
  }).messages({
    'object.unknown': 'الحقل {#label} غير مسموح به'
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

// ===========================================
// validate verify OTP
// ===========================================
function validateVerifyOtp (data) {
  const schema = Joi.object({
    session_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرّف الجلسة يجب أن يكون نصاً',
        'string.empty': 'معرّف الجلسة مطلوب',
        'string.guid': 'معرّف الجلسة غير صالح',
        'any.required': 'معرّف الجلسة مطلوب'
      }),

    otp: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.base': 'رمز التحقق يجب أن يكون نصاً',
        'string.empty': 'رمز التحقق مطلوب',
        'string.length': 'رمز التحقق يجب أن يتكون من 6 أرقام',
        'string.pattern.base': 'رمز التحقق يجب أن يحتوي على أرقام فقط',
        'any.required': 'رمز التحقق مطلوب'
      })
  })

  return schema.validate(data, { abortEarly: false })
}

function validateDeviceToken (data) {
  const schema = Joi.object({
    fcm_token: Joi.string().trim().min(20).required(),
    platform: Joi.string().valid('android', 'ios', 'web').optional(),
    device_id: Joi.string().trim().max(255).optional()
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

function validateSetupPin (data) {
  const schema = Joi.object({
    pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'pin must be 6 digits',
      'string.pattern.base': 'pin must contain digits only'
    }),
    confirm_pin: Joi.string().valid(Joi.ref('pin')).required().messages({
      'any.only': 'confirm_pin must match pin'
    })
  })

  return schema.validate(data, { abortEarly: false })
}

function validateVerifyAppPin (data) {
  const schema = Joi.object({
    pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'pin must be 6 digits',
      'string.pattern.base': 'pin must contain digits only'
    })
  })

  return schema.validate(data, { abortEarly: false })
}

function validateChangePin (data) {
  const schema = Joi.object({
    old_pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'old_pin must be 6 digits',
      'string.pattern.base': 'old_pin must contain digits only'
    }),
    new_pin: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'new_pin must be 6 digits',
      'string.pattern.base': 'new_pin must contain digits only'
    }),
    confirm_new_pin: Joi.string().valid(Joi.ref('new_pin')).required().messages({
      'any.only': 'confirm_new_pin must match new_pin'
    })
  })

  const { error, value } = schema.validate(data, { abortEarly: false })

  if (error) {
    return { error, value }
  }

  if (value.old_pin === value.new_pin) {
    return {
      error: {
        details: [{ message: 'new_pin must be different from old_pin' }]
      },
      value
    }
  }

  return { error: null, value }
}

function validateEmployeeVerifyPin (data) {
  const schema = Joi.object({
    userName: Joi.string()
      .trim()
      .min(3)
      .max(50)
      .required()
      .messages(userNameMessages),

    password: Joi.string()
      .min(6)
      .required()
      .messages(passwordMessages)
  }).messages({
    'object.unknown': 'الحقل {#label} غير مسموح به'
  })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

function validateCreateChallenge (data) {
  const schema = Joi.object({
    pin_session_id: Joi.string().uuid().required()
  })

  return schema.validate(data, { abortEarly: false })
}

function validateVerifySignature (data) {
  const schema = Joi.object({
    challenge_id: Joi.string().uuid().required(),
    signature: Joi.string().trim().min(20).required()
  })

  return schema.validate(data, { abortEarly: false })
}

function validateRefreshToken (data) {
  const schema = Joi.object({
    refreshToken: Joi.string().trim().required().messages({
      'string.base': 'refresh token يجب أن يكون نصاً',
      'string.empty': 'refresh token مطلوب',
      'any.required': 'refresh token مطلوب'
    })
  })

  return schema.validate(data, { abortEarly: false })
}

function validateResendOtp (data) {
  const schema = Joi.object({
    session_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.base': 'معرّف الجلسة يجب أن يكون نصاً',
        'string.empty': 'معرّف الجلسة مطلوب',
        'string.guid': 'معرّف الجلسة غير صالح',
        'any.required': 'معرّف الجلسة مطلوب'
      })
  })

  return schema.validate(data, { abortEarly: false })
}

module.exports = {
  validateRegisterEmp,
  validateRegisterCitizen,
  validateLogin,
  validateVerifyOtp,
  validateDeviceToken,
  validateSetupPin,
  validateVerifyAppPin,
  validateChangePin,
  validateChangeCitizenPin: validateChangePin,
  validateEmployeeVerifyPin,
  validateCreateChallenge,
  validateVerifySignature,
  validateRefreshToken,
  validateResendOtp
}
