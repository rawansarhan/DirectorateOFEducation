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

module.exports = {
  userNameMessages,
  emailMessages,
  phoneMessages,
  passwordMessages,
  idMessages,
  ARABIC_NAME_PATTERN,
  personNameMessages,
  nationalIdMessages,
}
