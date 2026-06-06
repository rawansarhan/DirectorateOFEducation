async function validateFields (config, inputData) {
  const fieldRules = config.config_json?.fields || []

  if (!Array.isArray(fieldRules)) {
    throw new Error('fields config غير صحيح')
  }

  for (const rule of fieldRules) {
    const key = rule.key || rule.field_name

    if (!key) {
      continue
    }

    const value = inputData[key] ?? inputData.fields?.[key]

    if (rule.required && (value === null || value === undefined || value === '')) {
      throw new Error(`الحقل "${key}" مطلوب`)
    }
  }
}

module.exports = { validateFields }
