'use strict'

const Joi = require('joi')

// ============================================
// أنماط ورسائل عربية (متوافقة مع authValidations)
// ============================================
const ARABIC_NAME_PATTERN = /^[؀-ۿa-zA-Z][؀-ۿa-zA-Z\s.'-]{1,49}$/

const personNameMessages = (label) => ({
  'string.base': `${label} يجب أن يكون نصاً`,
  'string.empty': `${label} مطلوب`,
  'string.min': `${label} يجب أن يكون حرفين على الأقل`,
  'string.max': `${label} يجب ألا يتجاوز 50 حرفاً`,
  'string.pattern.base': `${label} يجب أن يحتوي على أحرف عربية أو لاتينية فقط`
})

const idMessages = (label) => ({
  'number.base': `${label} يجب أن يكون رقماً`,
  'number.integer': `${label} يجب أن يكون رقماً صحيحاً`,
  'number.positive': `${label} يجب أن يكون رقماً موجباً`
})

const pinSchema = Joi.string()
  .length(6)
  .pattern(/^\d+$/)
  .messages({
    'string.base': 'رمز PIN يجب أن يكون نصاً',
    'string.length': 'رمز PIN يجب أن يتكون من 6 أرقام',
    'string.pattern.base': 'رمز PIN يجب أن يحتوي على أرقام فقط'
  })

// =======================================
// تعديل موظف — كل الحقول اختيارية، لكن يجب إرسال حقل واحد على الأقل.
// قواعد ترابطية:
//   * password   → يتطلب confirm_password مطابقاً.
//   * pin        → يتطلب confirm_pin مطابقاً (ولتشفير المفتاح الخاص).
//   * private_key→ يتطلب public_key (لإعادة تشفيره والتحقق من المطابقة).
//   * تغيير الدور/القسم/المؤسسة يجب أن يكون كاملاً (الثلاثة معاً).
// =======================================
function validateUpdateEmployee (data) {
  const schema = Joi.object({
    first_name: Joi.string().trim().min(2).max(50).pattern(ARABIC_NAME_PATTERN)
      .messages(personNameMessages('الاسم الأول')),

    last_name: Joi.string().trim().min(2).max(50).pattern(ARABIC_NAME_PATTERN)
      .messages(personNameMessages('الاسم الأخير')),

    father_name: Joi.string().trim().min(2).max(50).pattern(ARABIC_NAME_PATTERN)
      .messages(personNameMessages('اسم الأب')),

    mother_name: Joi.string().trim().min(2).max(50).pattern(ARABIC_NAME_PATTERN)
      .messages(personNameMessages('اسم الأم')),

    national_id: Joi.string().trim().length(11).pattern(/^\d{11}$/)
      .messages({
        'string.length': 'الرقم الوطني يجب أن يتكون من 11 رقماً',
        'string.pattern.base': 'الرقم الوطني يجب أن يحتوي على أرقام فقط'
      }),

    userName: Joi.string().trim().min(3).max(50).pattern(/^\S+$/)
      .messages({
        'string.min': 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل',
        'string.max': 'اسم المستخدم يجب ألا يتجاوز 50 حرفاً',
        'string.pattern.base': 'اسم المستخدم يجب ألا يحتوي على فراغات'
      }),

    email: Joi.string().email().lowercase()
      .messages({ 'string.email': 'صيغة البريد الإلكتروني غير صحيحة' }),

    phone_number: Joi.string().pattern(/^09\d{8}$/)
      .messages({ 'string.pattern.base': 'رقم الهاتف يجب أن يبدأ بـ 09 ويتكون من 10 أرقام' }),

    is_active: Joi.boolean()
      .messages({ 'boolean.base': 'حالة التفعيل يجب أن تكون true أو false' }),

    // إعادة التعيين (الدور/القسم/المؤسسة)
    organization_id: Joi.number().integer().positive().messages(idMessages('معرّف المؤسسة')),
    department_id: Joi.number().integer().positive().messages(idMessages('معرّف القسم')),
    role_id: Joi.number().integer().positive().messages(idMessages('معرّف الدور')),

    // كلمة المرور
    password: Joi.string().min(6)
      .messages({ 'string.min': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
    confirm_password: Joi.string().valid(Joi.ref('password'))
      .messages({ 'any.only': 'confirm_password يجب أن يطابق password' }),

    // رمز PIN
    pin: pinSchema,
    confirm_pin: Joi.string().valid(Joi.ref('pin'))
      .messages({ 'any.only': 'confirm_pin يجب أن يطابق pin' }),

    // المفاتيح الرقمية
    public_key: Joi.string().trim()
      .messages({ 'string.base': 'المفتاح العام يجب أن يكون نصاً' }),
    private_key: Joi.string().trim()
      .messages({ 'string.base': 'المفتاح الخاص يجب أن يكون نصاً' })
  })
    .min(1)
    // عند إرسال password يجب إرسال confirm_password والعكس (وكذلك pin)
    .with('password', 'confirm_password')
    .with('confirm_password', 'password')
    .with('pin', 'confirm_pin')
    .with('confirm_pin', 'pin')
    // إعادة التعيين تتطلب الحقول الثلاثة معاً
    .and('organization_id', 'department_id', 'role_id')
    // private_key يتطلب public_key، وتشفيره يتطلب pin
    .with('private_key', 'public_key')
    .with('private_key', 'pin')
    .messages({
      'object.min': 'يجب إرسال حقل واحد على الأقل للتعديل',
      'object.with': 'الحقل {#mainWithLabel} يتطلب إرسال {#peerWithLabel} أيضاً',
      'object.and': 'تغيير الدور/القسم/المؤسسة يتطلب إرسال organization_id و department_id و role_id معاً',
      'object.unknown': 'الحقل {#label} غير مسموح به'
    })

  return schema.validate(data, { abortEarly: false, allowUnknown: false })
}

// =======================================
// استعلام قائمة الموظفين (ترقيم + بحث)
// =======================================
function validateListEmployeesQuery (query) {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1)
      .messages({
        'number.base': 'رقم الصفحة يجب أن يكون رقماً',
        'number.min': 'رقم الصفحة يجب أن يكون 1 على الأقل'
      }),

    limit: Joi.number().integer().min(1).max(100).default(20)
      .messages({
        'number.base': 'حجم الصفحة يجب أن يكون رقماً',
        'number.min': 'حجم الصفحة يجب أن يكون 1 على الأقل',
        'number.max': 'حجم الصفحة يجب ألا يتجاوز 100'
      }),

    search: Joi.string().trim().allow('').max(100)
      .messages({ 'string.max': 'نص البحث يجب ألا يتجاوز 100 حرف' })
  }).messages({ 'object.unknown': 'الحقل {#label} غير مسموح به' })

  return schema.validate(query, { abortEarly: false, allowUnknown: false })
}

module.exports = {
  validateUpdateEmployee,
  validateListEmployeesQuery
}
