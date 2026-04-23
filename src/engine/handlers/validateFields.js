const {Field} = require('../../entities/Field')
async function validateFields(config, inputData) {

  const fieldRules = config.config_json.fields

  for (const rule of fieldRules) {

    const field = await Field.findByPk(rule.field_id)

    const value = inputData[field.field_name]

    if (rule.required && (value === null || value === undefined || value === '')) {
      throw new Error(`الحقل ${field.field_name} مطلوب`)
    }
  }
}
module.exports = { validateFields }
