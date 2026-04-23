const { File } = require('../entities')

async function validateFiles(config, inputData) {

  const fileRules = config.config_json.files

  if (!Array.isArray(fileRules)) {
    throw new Error('files config غير صحيح')
  }

  for (const rule of fileRules) {

    // 1. جيب تعريف الملف من DB
    const fileDef = await File.findByPk(rule.file_id)

    if (!fileDef) {
      throw new Error(`الملف غير موجود: ${rule.file_id}`)
    }

    // 2. اسم المفتاح المتوقع من الفرونت
    const fileKey = fileDef.file_name

    // 3. تحقق وجود الملف في الطلب
    const uploadedFile = inputData.files?.[fileKey]

    // 4. إذا مطلوب وما انرفع
    if (rule.required && !uploadedFile) {
      throw new Error(`الملف ${fileDef.file_name} مطلوب`)
    }

    // 5. (اختياري) تحقق النوع
    if (uploadedFile && fileDef.file_type) {

      const ext = uploadedFile.mimetype || uploadedFile.type

      if (fileDef.file_type !== ext) {
        throw new Error(
          `نوع الملف غير صحيح لـ ${fileDef.file_name}`
        )
      }
    }
  }
}
module.exports = { validateFiles }
