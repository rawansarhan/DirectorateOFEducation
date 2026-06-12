'use strict'

/**
 * =============================================================================
 * pdfGenerationService — توليد PDF من قالب (GENERATE_PDF / SERVICE_TASK)
 * =============================================================================
 *
 * التدفق الكامل:
 *   1) USER_TASK (complete / submit-documents/complete):
 *        templates: [{ id: 1, values: { employee: "...", job: "..." } }]
 *      → documentInstanceService ينشئ document_instance:
 *        data_json = values, generated_pdf_path = null
 *
 *   2) SERVICE_TASK (stage_config action GENERATE_PDF):
 *        payload: { template_id: 1 }
 *      → GeneratePDF strategy يستدعي generatePdfFromTemplate()
 *      → يملأ PDF ويحدّث document_instance.generated_pdf_path
 *
 * مطابقة الحقول (ACROFORM — مثل docs/file 1 (3).pdf):
 *   - أسماء حقول PDF الداخلية (manager-name, employee, job, department)
 *     يجب أن تطابق keys في values و widgets[].data.id في config_json
 *   - pdf-lib يقرأ AcroForm fields من الملف — ليست labels الظاهرة على الشاشة
 *
 * engine_type:
 *   - ACROFORM  → fillAcroFormPdf (الافتراضي لملفات PDF بحقول جاهزة)
 *   - POSITIONED → fillPositionedPdf عند وجود data.pdf: { page, x, y } في widget
 */

const fs = require('fs')
const path = require('path')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const { normalizeStoredFilePath } = require('../../../../core/utils/filePath')

/** يحوّل /uploads/file.pdf إلى مسار مطلق على القرص */
function resolveAbsoluteUploadPath (storedPath) {
  const normalized = normalizeStoredFilePath(storedPath)

  if (!normalized) {
    throw new Error('مسار ملف القالب غير صالح')
  }

  return path.join(process.cwd(), normalized.replace(/^\//, ''))
}

/** مفاتيح widgets[].data.id من config_json — للتحقق قبل الملء */
function collectWidgetKeys (configJson = {}) {
  const keys = new Set()

  for (const widget of configJson.widgets || []) {
    const widgetId = widget?.data?.id

    if (widgetId) {
      keys.add(String(widgetId))
    }
  }

  return keys
}

/**
 * يفلتر values: فقط المفاتيح المعرفة في config_json.widgets
 * (إذا widgets فارغة يمرّر كل values)
 */
function filterValuesByTemplateKeys (values = {}, configJson = {}) {
  const widgetKeys = collectWidgetKeys(configJson)
  const filtered = {}

  for (const [key, value] of Object.entries(values || {})) {
    if (!widgetKeys.size || widgetKeys.has(key)) {
      filtered[key] = value
    }
  }

  return filtered
}

/** يملأ حقل AcroForm واحد — text / dropdown / checkbox / radio */
function setAcroFormFieldValue (form, fieldName, rawValue) {
  const value = rawValue == null ? '' : String(rawValue)

  try {
    form.getTextField(fieldName).setText(value)
    return true
  } catch (_) {}

  try {
    form.getDropdown(fieldName).select(value)
    return true
  } catch (_) {}

  try {
    const checkbox = form.getCheckBox(fieldName)
    const checked =
      rawValue === true ||
      rawValue === 'true' ||
      rawValue === 1 ||
      rawValue === '1' ||
      rawValue === 'yes'

    if (checked) {
      checkbox.check()
    } else {
      checkbox.uncheck()
    }

    return true
  } catch (_) {}

  try {
    form.getRadioGroup(fieldName).select(value)
    return true
  } catch (_) {}

  return false
}

/**
 * ACROFORM: يمر على كل key في values ويحاول ملء حقل PDF بنفس الاسم
 * مثال: values.employee → حقل PDF اسمه "employee"
 */
async function fillAcroFormPdf ({ pdfDoc, values = {} }) {
  const form = pdfDoc.getForm()
  const filled = []
  const skipped = []

  for (const [key, value] of Object.entries(values)) {
    if (setAcroFormFieldValue(form, key, value)) {
      filled.push(key)
    } else {
      skipped.push(key)
    }
  }

  if (filled.length) {
    try {
      form.updateFieldAppearances()
    } catch (_) {
      // بعض القوالب لا تدعم تحديث المظهر — نتابع
    }
  }

  return { filled, skipped }
}

/**
 * POSITIONED: يرسم النص عند إحداثيات محددة في widget.data.pdf
 * { page: 0, x: 120, y: 500, font_size: 12 }
 */
async function fillPositionedPdf ({ pdfDoc, configJson = {}, values = {} }) {
  const widgets = configJson.widgets || []
  const filled = []
  const skipped = []

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const widget of widgets) {
    const data = widget?.data || {}
    const key = data.id
    const pdfMeta = data.pdf || data.position

    if (!key || !pdfMeta || values[key] == null) {
      if (key && values[key] != null) {
        skipped.push(key)
      }
      continue
    }

    const pageIndex = Number(pdfMeta.page ?? 0)
    const page = pages[pageIndex]

    if (!page) {
      skipped.push(key)
      continue
    }

    const x = Number(pdfMeta.x ?? 0)
    const y = Number(pdfMeta.y ?? 0)
    const size = Number(pdfMeta.font_size ?? pdfMeta.size ?? 12)

    page.drawText(String(values[key]), {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0)
    })

    filled.push(key)
  }

  return { filled, skipped }
}

function buildGeneratedPdfPath ({ transactionId, templateId, instanceId }) {
  const fileName = `generated-${transactionId}-tpl${templateId}-inst${instanceId}-${Date.now()}.pdf`
  return `/uploads/${fileName}`
}

/**
 * نقطة الدخول الرئيسية — يُستدعى من GeneratePDF strategy
 */
async function generatePdfFromTemplate ({
  documentTemplate,
  documentInstance
}) {
  if (!documentTemplate?.file_path) {
    throw new Error('ملف القالب غير موجود')
  }

  if (!documentInstance?.data_json) {
    throw new Error(
      'document_instance لا يحتوي values — يجب إرسال templates في مرحلة USER_TASK أولاً'
    )
  }

  const templateAbsolutePath = resolveAbsoluteUploadPath(documentTemplate.file_path)

  if (!fs.existsSync(templateAbsolutePath)) {
    throw new Error(`ملف القالب غير موجود على القرص: ${documentTemplate.file_path}`)
  }

  const configJson = documentTemplate.config_json || {}
  const values = filterValuesByTemplateKeys(
    documentInstance.data_json,
    configJson
  )

  if (!Object.keys(values).length) {
    throw new Error('لا توجد قيم للملء في document_instance.data_json')
  }

  const templateBytes = fs.readFileSync(templateAbsolutePath)
  const pdfDoc = await PDFDocument.load(templateBytes)

  let fillResult = { filled: [], skipped: [] }

  // ACROFORM أولاً أو POSITIONED حسب engine_type — مع fallback للطريقة الأخرى
  if (documentTemplate.engine_type === 'POSITIONED') {
    fillResult = await fillPositionedPdf({ pdfDoc, configJson, values })

    if (!fillResult.filled.length) {
      fillResult = await fillAcroFormPdf({ pdfDoc, values })
    }
  } else {
    fillResult = await fillAcroFormPdf({ pdfDoc, values })

    if (!fillResult.filled.length) {
      fillResult = await fillPositionedPdf({ pdfDoc, configJson, values })
    }
  }

  if (!fillResult.filled.length) {
    throw new Error(
      'لم يتم مطابقة أي key من values مع حقول القالب — تحقق من أسماء الحقول في PDF أو config_json.widgets'
    )
  }

  const outputStoredPath = buildGeneratedPdfPath({
    transactionId: documentInstance.transaction_id,
    templateId: documentTemplate.id,
    instanceId: documentInstance.id
  })

  const outputAbsolutePath = resolveAbsoluteUploadPath(outputStoredPath)
  const uploadsDir = path.dirname(outputAbsolutePath)

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(outputAbsolutePath, pdfBytes)

  return {
    generated_pdf_path: outputStoredPath,
    filled_keys: fillResult.filled,
    skipped_keys: fillResult.skipped,
    values_used: values
  }
}

module.exports = {
  generatePdfFromTemplate,
  collectWidgetKeys,
  filterValuesByTemplateKeys,
  resolveAbsoluteUploadPath
}
