'use strict'

/**
 * arabicText — تجهيز النص العربي للرسم في pdf-lib
 *
 * هناك نمطان حسب العارض المستهدف:
 *
 *  - logical (الافتراضي): نرسل النص الخام كما هو، ويتكفّل العارض الحديث
 *    (المتصفّحات: Chrome/pdfium و Firefox/pdf.js) بالربط (shaping) واتجاه RTL.
 *    هذا هو الصحيح عند عرض/تحميل ملفات الـ PDF داخل المتصفّح.
 *
 *  - visual: نقوم نحن بالـ reshape ثم bidi لإنتاج ترتيب بصري جاهز.
 *    مناسب للعارضات التي لا تشكّل النص (مثل Adobe Acrobat على سطح المكتب).
 *    ملاحظة: pdf.js قد يقلب أحرف Presentation-Forms في هذا النمط.
 *
 * يُضبط عبر متغيّر البيئة PDF_ARABIC_SHAPING = 'logical' | 'visual'
 */

const reshaper = require('arabic-reshaper')
const bidiFactory = require('bidi-js')

const bidi = bidiFactory()

function rawArabicText (text) {
  return String(text ?? '')
}

function shapeArabicText (text) {
  const str = String(text ?? '')

  if (!str.trim()) {
    return str
  }

  const reshaped = reshaper.convertArabic(str)
  const levels = bidi.getEmbeddingLevels(reshaped, 'rtl')

  return bidi.getReorderedString(reshaped, levels)
}

/** يعيد دالة التجهيز المناسبة حسب الإعداد (الافتراضي logical) */
function getArabicTextShaper () {
  const mode = String(process.env.PDF_ARABIC_SHAPING || 'logical').toLowerCase()
  return mode === 'visual' ? shapeArabicText : rawArabicText
}

module.exports = {
  shapeArabicText,
  rawArabicText,
  getArabicTextShaper
}
