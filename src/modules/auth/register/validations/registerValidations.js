const Joi = require('joi')
const {
  validatePublicKeyPem,
  validatePrivateKeyPem,
  assertPrivatePublicKeyPair
} = require('../../shared/services/cryptoAuthService')
const {
  userNameMessages,
  emailMessages,
  phoneMessages,
  passwordMessages,
  idMessages,
  ARABIC_NAME_PATTERN,
  personNameMessages,
  nationalIdMessages,
} = require('../../shared/validations/authValidationMessages')

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

module.exports = {
  validateRegisterEmp,
  validateRegisterCitizen,
  validateVerifyOtp,
}
