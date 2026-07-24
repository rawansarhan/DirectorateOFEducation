const Joi = require('joi')

function ValidateUpsertApplication (data) {
  const schema = Joi.object({
    apple_store_url: Joi.string().uri().max(500).allow(null, ''),
    google_play_url: Joi.string().uri().max(500).allow(null, ''),
    update_strategy: Joi.string().valid('store', 'direct')
  }).min(1)

  return schema.validate(data, { abortEarly: false, allowUnknown: false })
}

function ValidateCreateVersion (data) {
  const schema = Joi.object({
    platform: Joi.string().valid('android', 'ios', 'windows').required(),
    version_name: Joi.string().trim().max(50).required(),
    version_code: Joi.number().integer().min(1).required(),
    apk_url: Joi.string().uri().max(500).allow(null, ''),
    apk_size: Joi.number().integer().min(0).allow(null),
    changelog: Joi.string().max(2000).allow(null, ''),
    force_update_below_version_code: Joi.number().integer().min(1).allow(null),
    soft_update_below_version_code: Joi.number().integer().min(1).allow(null),
    status: Joi.string().valid('active', 'inactive')
  })

  return schema.validate(data, { abortEarly: false, allowUnknown: false })
}

function ValidateUpdateVersion (data) {
  const schema = Joi.object({
    apk_url: Joi.string().uri().max(500).allow(null, ''),
    apk_size: Joi.number().integer().min(0).allow(null),
    changelog: Joi.string().max(2000).allow(null, ''),
    force_update_below_version_code: Joi.number().integer().min(1).allow(null),
    soft_update_below_version_code: Joi.number().integer().min(1).allow(null),
    status: Joi.string().valid('active', 'inactive')
  }).min(1)

  return schema.validate(data, { abortEarly: false, allowUnknown: false })
}

module.exports = {
  ValidateUpsertApplication,
  ValidateCreateVersion,
  ValidateUpdateVersion
}
