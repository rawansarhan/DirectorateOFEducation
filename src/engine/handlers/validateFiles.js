async function validateFiles (config, inputData) {
  const fileRules = config.config_json?.files || []

  if (!Array.isArray(fileRules)) {
    throw new Error('files config غير صحيح')
  }

  for (const rule of fileRules) {
    const key = rule.key || rule.file_name

    if (!key) {
      continue
    }

    const uploadedFile = inputData.files?.[key] ?? inputData[key]

    if (rule.required && !uploadedFile) {
      throw new Error(`الملف "${key}" مطلوب`)
    }

    if (uploadedFile && rule.type) {
      const ext = uploadedFile.mimetype || uploadedFile.type

      if (rule.type !== ext) {
        throw new Error(`نوع الملف غير صحيح لـ "${key}"`)
      }
    }
  }
}

module.exports = { validateFiles }
