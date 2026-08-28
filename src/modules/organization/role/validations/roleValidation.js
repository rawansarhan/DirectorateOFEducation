const Joi = require('joi')

/**
 * الإنشاء له وضعان متبادلان:
 *  - `role_id`: ربط دور موجود مسبقاً في جدول roles.
 *  - `name` + `code`: تعريف دور جديد ثم ربطه.
 * إرسال الاثنين معاً أو عدم إرسال أيٍّ منهما خطأ تحقق.
 */
function ValidateCreateRole(data) {
  const schema = Joi.object({
    role_id: Joi.number()
      .integer()
      .positive(),

    name: Joi.string()
      .trim()
      .min(2)
      .max(100),

    code: Joi.string()
      .trim()
      .pattern(/^[A-Z0-9_]+$/)
      .min(2)
      .max(100)
      .messages({
        'string.pattern.base': 'يجب أن يحتوي الـ code على أحرف إنجليزية كبيرة وأرقام وشرطة سفلية فقط'
      }),

    organization_id: Joi.number()
      .integer()
      .positive()
      .required(),

    department_id: Joi.number()
      .integer()
      .positive()
      .required(),

    parent_id: Joi.number()
      .integer()
      .positive()
      .allow(null)
  })
    .oxor('role_id', 'name')
    .oxor('role_id', 'code')
    .and('name', 'code')
    .or('role_id', 'name')
    .messages({
      'object.oxor': 'أرسل إمّا role_id لدور موجود أو name و code لدور جديد، وليس الاثنين',
      'object.and': 'name و code مطلوبان معاً عند تعريف دور جديد',
      'object.missing': 'يجب اختيار دور موجود (role_id) أو تعريف دور جديد (name و code)'
    })

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

function ValidateUpdateRole(data) {
  const schema = Joi.object({
    organization_id: Joi.number()
      .integer()
      .positive(),

    department_id: Joi.number()
      .integer()
      .positive(),

    parent_id: Joi.number()
      .integer()
      .positive()
      .allow(null)
  }).min(1)

  return schema.validate(data, {
    abortEarly: false,
    allowUnknown: false
  })
}

module.exports = {
  ValidateCreateRole,
  ValidateUpdateRole
}
