'use strict'

/**
 * =============================================================================
 * pdfGenerationService — توليد PDF من قالب (GENERATE_PDF / SERVICE_TASK)
 * =============================================================================
 *
 * التدفق الكامل:
 *   1) USER_TASK (complete / submit-documents/complete):
 *        templates: [{ id: 1, values: { employee: "...", job: "..." } }]
 *      → تُحفظ القيم في transaction.data فقط (بدون document_instance)
 *
 *   2) SERVICE_TASK (stage_config action GENERATE_PDF):
 *        payload: { template_id: 1 }
 *      → يملأ PDF من القيم المخزّنة
 *      → عند النجاح فقط يُنشأ document_instance + generated_pdf_path
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
const { createHash } = require('crypto')
const fontkit = require('@pdf-lib/fontkit')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
const {
  normalizeStoredFilePath,
  resolveAbsoluteUploadPath
} = require('../../../../core/utils/filePath')
const { injectIntegrityQr } = require('./qrStampService')
const { API_PUBLIC_URL } = require('../../../../core/config/env')

const DEFAULT_UNICODE_FONT_PATH = path.join(
  process.cwd(),
  'assets/fonts/NotoSansArabic-Regular.ttf'
)

function resolveUnicodeFontPath () {
  const configured = process.env.PDF_UNICODE_FONT_PATH

  if (configured && String(configured).trim()) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured)
  }

  return DEFAULT_UNICODE_FONT_PATH
}

function containsNonLatin1Characters (value) {
  return /[^\u0000-\u00ff]/.test(String(value ?? ''))
}

function valuesNeedUnicodeFont (values = {}) {
  return Object.values(values).some(containsNonLatin1Characters)
}

async function embedUnicodeFont (pdfDoc) {
  const fontPath = resolveUnicodeFontPath()

  if (!fs.existsSync(fontPath)) {
    throw new Error(
      `خط Unicode للعربية غير موجود: ${fontPath}. ضع NotoSansArabic-Regular.ttf أو عيّن PDF_UNICODE_FONT_PATH`
    )
  }

  pdfDoc.registerFontkit(fontkit)

  const fontBytes = fs.readFileSync(fontPath)

  return pdfDoc.embedFont(fontBytes, { subset: true })
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
 * ملاحظة: ACROFORM لا يستخدم هذا افتراضياً — widgets للواجهة فقط
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

function resolvePdfSettings (configJson = {}) {
  const pdf = configJson.pdf || {}

  return {
    flatten: pdf.flatten !== false,
    auto_font_size: pdf.auto_font_size !== false,
    fill_mode: pdf.fill_mode === 'ACROFORM' ? 'ACROFORM' : 'BURN_IN',
    font_size: pdf.font_size != null ? Number(pdf.font_size) : null,
    min_font_size: Number(pdf.min_font_size ?? 10),
    max_font_size: Number(pdf.max_font_size ?? 14),
    line_height: Number(pdf.line_height ?? 14),
    filter_by_widgets: pdf.filter_by_widgets === true
  }
}

function resolveValuesForEngine ({
  engineType,
  dataJson = {},
  configJson = {},
  pdfSettings = {}
}) {
  if (engineType === 'POSITIONED') {
    return filterValuesByTemplateKeys(dataJson, configJson)
  }

  if (pdfSettings.filter_by_widgets) {
    return filterValuesByTemplateKeys(dataJson, configJson)
  }

  return { ...(dataJson || {}) }
}

function getTextFieldRectangle (textField) {
  const widgets = textField.acroField.getWidgets()

  if (!widgets?.length) {
    return null
  }

  return widgets[0].getRectangle()
}

function computeAutoFontSize ({
  text,
  font,
  width,
  height,
  minSize = 10,
  maxSize = 14,
  respectFieldHeight = true
}) {
  if (!font) {
    return maxSize
  }

  let upperBound = maxSize

  if (respectFieldHeight && height) {
    upperBound = Math.min(maxSize, height * 0.78)
  }

  const normalized = String(text ?? '')

  if (!normalized.trim()) {
    return upperBound
  }

  if (!width) {
    return upperBound
  }

  for (let size = upperBound; size >= minSize; size -= 0.5) {
    const textWidth = font.widthOfTextAtSize(normalized, size)

    if (textWidth <= width * 0.96) {
      return size
    }
  }

  return minSize
}

function resolveWidgetPageIndex (pdfDoc, widget) {
  const pages = pdfDoc.getPages()
  const targetRef = widget.P?.()

  if (!targetRef) {
    return 0
  }

  for (let index = 0; index < pages.length; index += 1) {
    if (pages[index].ref === targetRef) {
      return index
    }
  }

  return 0
}

function collectTextFieldPlacements (pdfDoc, form, values = {}) {
  const placements = []

  for (const [key, rawValue] of Object.entries(values)) {
    if (rawValue == null) {
      continue
    }

    try {
      const textField = form.getTextField(key)
      const widgets = textField.acroField.getWidgets()

      if (!widgets?.length) {
        continue
      }

      const widget = widgets[0]

      placements.push({
        key,
        value: String(rawValue),
        rect: widget.getRectangle(),
        pageIndex: resolveWidgetPageIndex(pdfDoc, widget)
      })
    } catch (_) {}
  }

  return placements
}

function resolveDrawFontSize ({ value, font, rect, pdfSettings }) {
  if (pdfSettings.font_size != null) {
    return pdfSettings.font_size
  }

  if (!pdfSettings.auto_font_size) {
    return pdfSettings.max_font_size
  }

  return computeAutoFontSize({
    text: value,
    font,
    width: rect.width,
    height: pdfSettings.line_height,
    minSize: pdfSettings.min_font_size,
    maxSize: pdfSettings.max_font_size,
    respectFieldHeight: false
  })
}

function resolveTextBaselineY ({ rect, fontSize, pdfSettings }) {
  const lineHeight = Math.max(rect.height, pdfSettings.line_height, fontSize * 1.05)
  return rect.y + (lineHeight - fontSize) / 2
}

function applyTextFieldFontSize ({
  textField,
  value,
  font,
  pdfSettings
}) {
  if (pdfSettings.font_size != null) {
    textField.setFontSize(pdfSettings.font_size)
    return pdfSettings.font_size
  }

  if (!pdfSettings.auto_font_size) {
    return null
  }

  const rect = getTextFieldRectangle(textField)

  if (!rect) {
    return null
  }

  const fontSize = computeAutoFontSize({
    text: value,
    font,
    width: rect.width,
    height: rect.height,
    minSize: pdfSettings.min_font_size,
    maxSize: pdfSettings.max_font_size
  })

  textField.setFontSize(fontSize)

  return fontSize
}

/** يملأ حقل AcroForm واحد — text / dropdown / checkbox / radio */
function setAcroFormFieldValue (form, fieldName, rawValue, options = {}) {
  const value = rawValue == null ? '' : String(rawValue)
  const { font = null, pdfSettings = resolvePdfSettings() } = options

  try {
    const textField = form.getTextField(fieldName)
    textField.setText(value)
    applyTextFieldFontSize({ textField, value, font, pdfSettings })
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
 * BURN_IN (الافتراضي): يقرأ مواقع حقول AcroForm، يثبّت النموذج، ثم يرسم النص
 * مباشرة على الصفحة بخط أكبر — لا يُقيّد بارتفاع صندوق الحقل الصغير (~13pt).
 */
async function fillAcroFormPdfBurnIn ({
  pdfDoc,
  values = {},
  unicodeFont = null,
  pdfSettings = resolvePdfSettings()
}) {
  const form = pdfDoc.getForm()
  const font =
    unicodeFont || (await pdfDoc.embedFont(StandardFonts.Helvetica))
  const placements = collectTextFieldPlacements(pdfDoc, form, values)
  const filled = placements.map(item => item.key)
  const skipped = Object.keys(values).filter(key => !filled.includes(key))

  for (const key of [...skipped]) {
    if (setAcroFormFieldValue(form, key, values[key], { font, pdfSettings })) {
      filled.push(key)
    }
  }

  if (pdfSettings.flatten) {
    try {
      form.flatten()
    } catch (_) {}
  }

  const pages = pdfDoc.getPages()

  for (const placement of placements) {
    const page = pages[placement.pageIndex]

    if (!page) {
      continue
    }

    const fontSize = resolveDrawFontSize({
      value: placement.value,
      font,
      rect: placement.rect,
      pdfSettings
    })

    page.drawText(placement.value, {
      x: placement.rect.x,
      y: resolveTextBaselineY({
        rect: placement.rect,
        fontSize,
        pdfSettings
      }),
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
  }

  return {
    filled,
    skipped: Object.keys(values).filter(key => !filled.includes(key)),
    flattened: pdfSettings.flatten,
    fill_mode: 'BURN_IN'
  }
}

/** ACROFORM: ملء حقول النموذج التقليدي (قد يُنتج خطاً صغيراً مع حقول ضيقة) */
async function fillAcroFormPdfLegacy ({
  pdfDoc,
  values = {},
  unicodeFont = null,
  pdfSettings = resolvePdfSettings()
}) {
  const form = pdfDoc.getForm()
  const filled = []
  const skipped = []
  const appearanceFont =
    unicodeFont || (await pdfDoc.embedFont(StandardFonts.Helvetica))

  for (const [key, value] of Object.entries(values)) {
    if (setAcroFormFieldValue(form, key, value, { font: appearanceFont, pdfSettings })) {
      filled.push(key)
    } else {
      skipped.push(key)
    }
  }

  if (filled.length) {
    try {
      form.updateFieldAppearances(appearanceFont)
    } catch (error) {
      if (unicodeFont) {
        throw error
      }
    }

    if (pdfSettings.flatten) {
      form.flatten()
    }
  }

  return {
    filled,
    skipped,
    flattened: filled.length > 0 && pdfSettings.flatten,
    fill_mode: 'ACROFORM'
  }
}

async function fillAcroFormPdf (options) {
  const pdfSettings = options.pdfSettings || resolvePdfSettings()

  if (pdfSettings.fill_mode === 'ACROFORM') {
    return fillAcroFormPdfLegacy(options)
  }

  return fillAcroFormPdfBurnIn(options)
}

/**
 * POSITIONED: يرسم النص عند إحداثيات محددة في widget.data.pdf
 * { page: 0, x: 120, y: 500, font_size: 12 }
 */
async function fillPositionedPdf ({
  pdfDoc,
  configJson = {},
  values = {},
  unicodeFont = null
}) {
  const widgets = configJson.widgets || []
  const filled = []
  const skipped = []

  const font =
    unicodeFont || (await pdfDoc.embedFont(StandardFonts.Helvetica))
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
 * يملأ حقول القالب في الذاكرة فقط — بدون إنشاء document_instance وبدون حفظ ملف.
 */
async function fillTemplatePdfDocument ({
  documentTemplate,
  dataJson
}) {
  if (!documentTemplate?.file_path) {
    throw new Error('ملف القالب غير موجود')
  }

  if (!dataJson || typeof dataJson !== 'object') {
    throw new Error(
      'قيم القالب غير موجودة — يجب إرسال templates[{ id, widgets/value }] في USER_TASK أولاً'
    )
  }

  const templateAbsolutePath = resolveAbsoluteUploadPath(documentTemplate.file_path)

  if (!fs.existsSync(templateAbsolutePath)) {
    throw new Error(`ملف القالب غير موجود على القرص: ${documentTemplate.file_path}`)
  }

  const configJson = documentTemplate.config_json || {}
  const pdfSettings = resolvePdfSettings(configJson)
  const values = resolveValuesForEngine({
    engineType: documentTemplate.engine_type,
    dataJson,
    configJson,
    pdfSettings
  })

  if (!Object.keys(values).length) {
    throw new Error('لا توجد قيم للملء في بيانات القالب')
  }

  const templateBytes = fs.readFileSync(templateAbsolutePath)
  const pdfDoc = await PDFDocument.load(templateBytes)

  const needsUnicodeFont = valuesNeedUnicodeFont(values)
  const unicodeFont = needsUnicodeFont
    ? await embedUnicodeFont(pdfDoc)
    : null

  let fillResult = { filled: [], skipped: [] }

  if (documentTemplate.engine_type === 'POSITIONED') {
    fillResult = await fillPositionedPdf({
      pdfDoc,
      configJson,
      values,
      unicodeFont
    })

    if (!fillResult.filled.length) {
      fillResult = await fillAcroFormPdf({
        pdfDoc,
        values,
        unicodeFont,
        pdfSettings
      })
    }
  } else {
    fillResult = await fillAcroFormPdf({
      pdfDoc,
      values,
      unicodeFont,
      pdfSettings
    })

    if (!fillResult.filled.length) {
      fillResult = await fillPositionedPdf({
        pdfDoc,
        configJson,
        values,
        unicodeFont
      })
    }
  }

  if (!fillResult.filled.length) {
    throw new Error(
      'لم يتم مطابقة أي key من values مع حقول القالب — تحقق من أسماء الحقول في PDF أو config_json.widgets'
    )
  }

  return {
    pdfDoc,
    configJson,
    values,
    filled_keys: fillResult.filled,
    skipped_keys: fillResult.skipped,
    flattened: fillResult.flattened === true
  }
}

/**
 * يحفظ PDF المملوء بعد وجود document_instance (حقن QR + كتابة الملف).
 */
async function persistFilledPdfDocument ({
  pdfDoc,
  configJson = {},
  documentTemplate,
  documentInstance,
  genesisHash = null,
  values = {},
  filled_keys: filledKeys = [],
  skipped_keys: skippedKeys = [],
  flattened = false
}) {
  if (!documentInstance?.id) {
    throw new Error('document_instance مطلوب قبل حفظ ملف GENERATE_PDF')
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

  const qrResult = await injectIntegrityQr({
    pdfDoc,
    configJson,
    transactionId: documentInstance.transaction_id,
    genesisHash,
    documentInstanceId: documentInstance.id,
    apiBaseUrl: API_PUBLIC_URL
  })

  const pdfBytes = await pdfDoc.save()
  fs.writeFileSync(outputAbsolutePath, pdfBytes)

  const contentHash = createHash('sha256').update(pdfBytes).digest('hex')

  return {
    generated_pdf_path: outputStoredPath,
    content_hash: contentHash,
    qr: qrResult,
    filled_keys: filledKeys,
    skipped_keys: skippedKeys,
    flattened,
    values_used: values
  }
}

/**
 * نقطة الدخول الرئيسية — يُستدعى عند وجود document_instance جاهز.
 */
async function generatePdfFromTemplate ({
  documentTemplate,
  documentInstance,
  genesisHash = null
}) {
  if (!documentInstance?.data_json) {
    throw new Error(
      'document_instance لا يحتوي values — يجب إرسال templates في مرحلة USER_TASK أولاً'
    )
  }

  const filled = await fillTemplatePdfDocument({
    documentTemplate,
    dataJson: documentInstance.data_json
  })

  return persistFilledPdfDocument({
    pdfDoc: filled.pdfDoc,
    configJson: filled.configJson,
    documentTemplate,
    documentInstance,
    genesisHash,
    values: filled.values,
    filled_keys: filled.filled_keys,
    skipped_keys: filled.skipped_keys,
    flattened: filled.flattened
  })
}

/**
 * يحوّل نوع حقل AcroForm الأصلي في الـ PDF إلى widget_type مقترح للقالب.
 *
 * أنواع القالب المسموحة فقط: text_field, date_picker, dropdown, check_list
 * (DOCUMENT_TEMPLATE_WIDGET_TYPES في stageConfigSchema). لذا:
 *   - PDFCheckBox  → check_list  (لا يوجد نوع checkbox مفرد)
 *   - PDFRadioGroup → dropdown   (radio_group غير مسموح في القالب — dropdown هو
 *     الـ single-select المعتمد على options المسموح)
 *
 * ملاحظة: لا يوجد date_picker في صيغة PDF؛ التاريخ يظهر كـ PDFTextField → text_field،
 * ويُغيَّر يدوياً إلى date_picker في config_json عند الحاجة.
 */
function mapPdfFieldToWidgetType (field) {
  const pdfFieldType = field?.constructor?.name || 'Unknown'

  switch (pdfFieldType) {
    case 'PDFTextField':
      return { pdf_field_type: 'PDFTextField', widget_type: 'text_field' }
    case 'PDFCheckBox':
      return { pdf_field_type: 'PDFCheckBox', widget_type: 'check_list' }
    case 'PDFDropdown':
      return { pdf_field_type: 'PDFDropdown', widget_type: 'dropdown' }
    case 'PDFRadioGroup':
      return { pdf_field_type: 'PDFRadioGroup', widget_type: 'dropdown' }
    default:
      return { pdf_field_type: pdfFieldType, widget_type: 'unknown' }
  }
}

function buildSuggestedWidget (fieldMeta) {
  const base = {
    widget_type: fieldMeta.widget_type,
    data: {
      id: fieldMeta.id,
      label: fieldMeta.id,
      is_required: false
    }
  }

  if (fieldMeta.widget_type === 'text_field') {
    base.data.input_type = 'text'
  }

  if (fieldMeta.widget_type === 'dropdown' && fieldMeta.options?.length) {
    base.data.options = fieldMeta.options
  }

  if (fieldMeta.widget_type === 'check_list') {
    base.data.options = fieldMeta.options?.length
      ? fieldMeta.options
      : [{ key: fieldMeta.id, value: fieldMeta.id }]
    base.data.min_selected = 0
    base.data.max_selected = base.data.options.length
  }

  return base
}

function buildSuggestedConfigJson (fields = [], options = {}) {
  const formId = options.form_id || 'template_form'
  const formName = options.form_name || 'نموذج القالب'

  return {
    form_id: formId,
    form_name: formName,
    widgets: fields.map(buildSuggestedWidget)
  }
}

function comparePdfFieldsWithConfig (pdfFields = [], configJson = {}) {
  const pdfIds = pdfFields.map(field => field.id)
  const configIds = [...collectWidgetKeys(configJson)]

  const pdfSet = new Set(pdfIds)
  const configSet = new Set(configIds)

  return {
    matched: pdfIds.filter(id => configSet.has(id)),
    pdf_only: pdfIds.filter(id => !configSet.has(id)),
    config_only: configIds.filter(id => !pdfSet.has(id))
  }
}

/**
 * يستخرج أسماء حقول AcroForm (الإفراغات) من ملف PDF — ليست labels الشاشة.
 * مثال docs/file 1 (3).pdf: manager-name, employee, job, department
 */
async function extractPdfAcroFormFieldsFromBytes (templateBytes) {
  if (!templateBytes?.length) {
    throw new Error('ملف PDF فارغ أو غير صالح')
  }

  const pdfDoc = await PDFDocument.load(templateBytes)
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  return fields.map((field) => {
    const fieldName = field.getName()
    const mapped = mapPdfFieldToWidgetType(field)
    const item = {
      id: fieldName,
      ...mapped
    }

    if (
      mapped.pdf_field_type === 'PDFDropdown' ||
      mapped.pdf_field_type === 'PDFRadioGroup'
    ) {
      try {
        const options = field.getOptions()

        if (options?.length) {
          item.options = options.map(option => ({
            key: String(option),
            value: String(option)
          }))
        }
      } catch (_) {}
    }

    return item
  })
}

async function extractPdfAcroFormFieldsFromPath (storedPath) {
  const templateAbsolutePath = resolveAbsoluteUploadPath(storedPath)

  if (!fs.existsSync(templateAbsolutePath)) {
    throw new Error(`ملف القالب غير موجود على القرص: ${storedPath}`)
  }

  const templateBytes = fs.readFileSync(templateAbsolutePath)

  return extractPdfAcroFormFieldsFromBytes(templateBytes)
}

module.exports = {
  fillTemplatePdfDocument,
  persistFilledPdfDocument,
  generatePdfFromTemplate,
  collectWidgetKeys,
  filterValuesByTemplateKeys,
  resolveAbsoluteUploadPath,
  embedUnicodeFont,
  extractPdfAcroFormFieldsFromBytes,
  extractPdfAcroFormFieldsFromPath,
  buildSuggestedConfigJson,
  comparePdfFieldsWithConfig
}
