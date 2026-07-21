'use strict'

/**
 * =============================================================================
 * finalDocumentBuilderService — توليد PDF نهائي مدمج للمعاملة (server-side)
 * =============================================================================
 *
 * يبني ملف PDF واحد:
 *   1) صفحة غلاف فيها رمز QR النهائي للمعاملة (الموقّع من سلطة الإصدار).
 *   2) كل ملفات GENERATE_PDF (document_instance.generated_pdf_path).
 *   3) كل ملفات file_picker المرفوعة (document_signature) — PDF تُنسخ صفحاتها،
 *      والصور (png/jpg) تُدرج كل واحدة في صفحة.
 *
 * يُحفظ ويُسجَّل كـ final_document (document_final_transactions) ويُحسب content_hash.
 * متاح فقط لمعاملة completed ولمالكها.
 */

const fs = require('fs')
const path = require('path')
const { createHash } = require('crypto')
const fontkit = require('@pdf-lib/fontkit')
const { PDFDocument, rgb } = require('pdf-lib')
const QRCode = require('qrcode')
const { getArabicTextShaper } = require('../../../../core/utils/arabicText')

const transactionRepository = require('../../transaction/repositories/transactionRepository')
const {
  processRepository,
  documentSignatureRepository
} = require('../../../workflow/public')
const documentInstanceRepository = require('../../document/repositories/documentInstanceRepository')
const documentFinalTransactionRepository =
  require('../repositories/documentFinalTransactionRepository')
const { createTransactionError } = require('../../transaction/utils/transactionErrors')
const {
  normalizeStoredFilePath,
  toPublicFileUrl,
  isSyntheticSignatureDocumentPath
} = require('../../../../core/utils/filePath')
const { API_PUBLIC_URL, FINAL_DOCUMENT_CACHE_TTL_SECONDS } = require('../../../../core/config/env')
const {
  getOrLoad,
  KEYS
} = require('../../../../core/cache/apiCacheService')
const {
  isAuthorityKeyConfigured,
  signDocumentBinding
} = require('../../integrityChain/services/authoritySignatureService')
const { buildVerificationUrl } = require('../../document/services/qrStampService')
const {
  resolveAbsoluteUploadPath,
  embedUnicodeFont
} = require('../../document/services/pdfGenerationService')
const {
  assessFinalDocumentReadiness,
  assertReadyForMerge
} = require('./finalDocumentReadinessService')
const {
  loadAuthorizedTransaction,
  CERTIFICATE_AUDIENCE
} = require('./transactionCertificateService')

const A4 = { width: 595.28, height: 841.89 }
const PAGE_MARGIN = 40
const COMPLETED_STATUS = 'completed'
const STATE_TITLE = 'الجمهورية العربية السورية'

const KUFI_FONT_PATH = path.join(
  process.cwd(),
  'assets/fonts/NotoKufiArabic-Regular.ttf'
)

const LOGO_CANDIDATES = [
  process.env.REPUBLIC_LOGO_PATH,
  path.join(process.cwd(), 'photo_2026-04-06_11-49-49.jpg'),
  path.join(process.cwd(), 'assets/republic-logo.jpg')
].filter(Boolean)

function embedFontFile (pdfDoc, absolutePath) {
  pdfDoc.registerFontkit(fontkit)
  return pdfDoc.embedFont(fs.readFileSync(absolutePath), { subset: true })
}

function resolveLogoPath () {
  return LOGO_CANDIDATES.find(candidate => fs.existsSync(candidate)) || null
}

async function embedRepublicLogo (pdfDoc) {
  const logoPath = resolveLogoPath()

  if (!logoPath) {
    return null
  }

  const bytes = fs.readFileSync(logoPath)
  const extension = path.extname(logoPath).replace('.', '').toLowerCase()

  return extension === 'png'
    ? pdfDoc.embedPng(bytes)
    : pdfDoc.embedJpg(bytes)
}

function getFileExtension (storedPath) {
  return path.extname(String(storedPath || '')).replace('.', '').toLowerCase()
}

function mapFinalDocumentRow (row) {
  const snapshot = row.qr_payload_snapshot || {}

  return {
    id: row.id,
    file_path: row.file_path,
    file_url: toPublicFileUrl(row.file_path),
    original_name: row.original_name,
    mime_type: row.mime_type,
    file_size_bytes: row.file_size_bytes,
    content_hash: snapshot.merged_content_hash ?? null,
    generated_at: row.generated_at
  }
}

function readUploadBytes (storedPath) {
  const absolutePath = resolveAbsoluteUploadPath(storedPath)

  if (!fs.existsSync(absolutePath)) {
    return null
  }

  return fs.readFileSync(absolutePath)
}

/** رابط QR النهائي — كل مسح يُصدر رمز تفاصيل جديد (6 أرقام، 5 دقائق) */
function buildFinalQr ({ transaction, generatedInstances }) {
  if (
    !generatedInstances.length ||
    !transaction.genesis_hash ||
    !isAuthorityKeyConfigured()
  ) {
    return null
  }

  const finalInstance = generatedInstances[generatedInstances.length - 1]

  const signature = signDocumentBinding({
    transactionId: transaction.id,
    genesisHash: transaction.genesis_hash,
    documentInstanceId: finalInstance.id
  })

  return {
    transaction_id: transaction.id,
    genesis_hash: transaction.genesis_hash,
    document_instance_id: finalInstance.id,
    signature,
    verification_url: buildVerificationUrl({
      apiBaseUrl: API_PUBLIC_URL,
      transactionId: transaction.id,
      genesisHash: transaction.genesis_hash,
      documentInstanceId: finalInstance.id,
      signatureBase64Url: signature
    })
  }
}

function drawArabicCentered (page, { text, y, size, font, color = rgb(0, 0, 0) }, shapeText) {
  const shaped = shapeText(text)
  const width = font.widthOfTextAtSize(shaped, size)

  page.drawText(shaped, {
    x: (A4.width - width) / 2,
    y,
    size,
    font,
    color
  })
}

function drawArabicRight (page, { text, y, size, font, color = rgb(0, 0, 0) }, shapeText) {
  const shaped = shapeText(text)
  const width = font.widthOfTextAtSize(shaped, size)

  page.drawText(shaped, {
    x: A4.width - PAGE_MARGIN - width,
    y,
    size,
    font,
    color
  })
}

async function drawCoverPage ({
  mergedPdf,
  bodyFont,
  kufiFont,
  logoImage,
  transaction,
  processName,
  finalQr,
  shapeText = getArabicTextShaper()
}) {
  const page = mergedPdf.addPage([A4.width, A4.height])

  // ===== الترويسة: العنوان (كوفي) أعلى اليمين + الشعار أعلى اليسار =====
  const headerTop = A4.height - PAGE_MARGIN

  drawArabicRight(page, {
    text: STATE_TITLE,
    y: headerTop - 34,
    size: 20,
    font: kufiFont
  }, shapeText)

  if (logoImage) {
    const logoWidth = 120
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth

    page.drawImage(logoImage, {
      x: PAGE_MARGIN,
      y: headerTop - logoHeight,
      width: logoWidth,
      height: logoHeight
    })
  }

  // ===== خط فاصل + عنوان الوثيقة (اسم العملية) تحت الترويسة =====
  const separatorY = headerTop - 72

  page.drawLine({
    start: { x: PAGE_MARGIN, y: separatorY },
    end: { x: A4.width - PAGE_MARGIN, y: separatorY },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6)
  })

  drawArabicCentered(page, {
    text: 'الوثيقة النهائية للمعاملة',
    y: separatorY - 48,
    size: 16,
    font: kufiFont
  }, shapeText)

  if (processName) {
    drawArabicCentered(page, {
      text: processName,
      y: separatorY - 72,
      size: 14,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2)
    }, shapeText)
  }

  // ===== بيانات الهوية في منتصف الصفحة =====
  const identityRows = [
    ['الاسم الأول', transaction.first_name],
    ['الاسم الأخير', transaction.last_name],
    ['اسم الأب', transaction.father_name],
    ['اسم الأم', transaction.mother_name],
    ['الرقم الوطني', transaction.national_id]
  ]

  let cursorY = A4.height / 2 + 120

  for (const [label, value] of identityRows) {
    drawArabicCentered(page, {
      text: `${label} : ${value ?? ''}`,
      y: cursorY,
      size: 15,
      font: bodyFont
    }, shapeText)
    cursorY -= 30
  }

  // ===== رمز QR النهائي أسفل بيانات الهوية (وسط الصفحة) =====
  cursorY -= 20

  if (finalQr?.verification_url) {
    const qrPng = await QRCode.toBuffer(finalQr.verification_url, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 600
    })

    const qrImage = await mergedPdf.embedPng(qrPng)
    const qrSize = 170

    page.drawImage(qrImage, {
      x: (A4.width - qrSize) / 2,
      y: cursorY - qrSize,
      width: qrSize,
      height: qrSize
    })

    drawArabicCentered(page, {
      text: 'امسح الرمز للتحقق — سيظهر رمز تفاصيل صالح 5 دقائق',
      y: cursorY - qrSize - 22,
      size: 11,
      font: bodyFont,
      color: rgb(0.25, 0.25, 0.25)
    }, shapeText)
  } else {
    drawArabicCentered(page, {
      text: 'لا يتوفّر رمز QR (لم تُولَّد وثيقة موقّعة بعد)',
      y: cursorY - 20,
      size: 12,
      font: bodyFont
    }, shapeText)
  }
}

async function appendPdfFile ({ mergedPdf, bytes }) {
  const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices())
  pages.forEach(page => mergedPdf.addPage(page))
}

async function appendImageFile ({ mergedPdf, bytes, extension }) {
  const image = extension === 'png'
    ? await mergedPdf.embedPng(bytes)
    : await mergedPdf.embedJpg(bytes)

  const page = mergedPdf.addPage([A4.width, A4.height])
  const maxWidth = A4.width - PAGE_MARGIN * 2
  const maxHeight = A4.height - PAGE_MARGIN * 2
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale

  page.drawImage(image, {
    x: (A4.width - drawWidth) / 2,
    y: (A4.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  })
}

async function appendFile ({ mergedPdf, storedPath, label, skipped }) {
  const normalized = normalizeStoredFilePath(storedPath)
  const extension = getFileExtension(normalized)

  try {
    const bytes = readUploadBytes(normalized)

    if (!bytes) {
      skipped.push({ file: normalized, label, reason: 'الملف غير موجود على القرص' })
      return
    }

    if (extension === 'pdf') {
      await appendPdfFile({ mergedPdf, bytes })
      return
    }

    if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
      await appendImageFile({
        mergedPdf,
        bytes,
        extension: extension === 'jpeg' ? 'jpg' : extension
      })
      return
    }

    skipped.push({ file: normalized, label, reason: `امتداد غير مدعوم للدمج: ${extension}` })
  } catch (error) {
    skipped.push({ file: normalized, label, reason: error.message })
  }
}

/**
 * يبني PDF صفحة الغلاف فقط (للمعاينة/الاختبار) — يعيد بايتات الملف.
 * shapeText: دالة تشكيل النص؛ الافتراضي التشكيل البصري (للعرض في Adobe/Chrome).
 *   مرّر دالة هوية (t => t) لمعاينة "منطقية" عبر pdfjs الذي يشكّل بنفسه.
 */
async function buildCoverPdfBytes ({
  transaction,
  processName = null,
  finalQr = null,
  shapeText = getArabicTextShaper()
}) {
  const pdf = await PDFDocument.create()
  const bodyFont = await embedUnicodeFont(pdf)
  const kufiFont = fs.existsSync(KUFI_FONT_PATH)
    ? await embedFontFile(pdf, KUFI_FONT_PATH)
    : bodyFont
  const logoImage = await embedRepublicLogo(pdf)

  await drawCoverPage({
    mergedPdf: pdf,
    bodyFont,
    kufiFont,
    logoImage,
    transaction,
    processName,
    finalQr,
    shapeText
  })

  return pdf.save()
}

async function generateMergedFinalDocument (
  transactionId,
  { userId = null, force = false, requireOwner = false } = {}
) {
  const numericTransactionId = Number.parseInt(transactionId, 10)

  if (!Number.isInteger(numericTransactionId) || numericTransactionId < 1) {
    throw createTransactionError('VALIDATION_ERROR', 'معرّف المعاملة غير صالح')
  }

  const transaction = requireOwner
    ? await loadAuthorizedTransaction(numericTransactionId, userId, {
      audience: CERTIFICATE_AUDIENCE.OWNER
    })
    : await transactionRepository.findById(numericTransactionId)

  if (!transaction) {
    throw createTransactionError('TRANSACTION_NOT_FOUND')
  }

  // idempotent: إذا وُجدت نسخة نهائية مسبقاً نرجّعها دون إعادة توليد/استبدال
  // (قراءة مكاشة — تُبطَّل تلقائياً عند توليد/تحديث الوثيقة النهائية)
  // force=true: يتخطّى ذلك ويعيد التوليد ويستبدل النسخة السابقة
  const existingFinalDocument = force
    ? null
    : await documentFinalTransactionRepository.findByTransactionIdCached(
      numericTransactionId
    )

  if (existingFinalDocument) {
    return getOrLoad(
      KEYS.finalDocumentGenerateResponse(numericTransactionId),
      async () => ({
        transaction_id: numericTransactionId,
        already_exists: true,
        final_document: mapFinalDocumentRow(existingFinalDocument)
      }),
      {
        label: `final-document:generate:tx:${numericTransactionId}`,
        ttlSeconds: FINAL_DOCUMENT_CACHE_TTL_SECONDS
      }
    )
  }

  if (transaction.status !== COMPLETED_STATUS) {
    throw createTransactionError(
      'VALIDATION_ERROR',
      'الوثيقة النهائية متاحة فقط للمعاملات المكتملة (completed)'
    )
  }

  const readiness = await assessFinalDocumentReadiness(numericTransactionId, {
    userId,
    requireCompleted: true,
    flushGeneratePdf: true,
    requireOwner
  })

  assertReadyForMerge(readiness)

  const [instances, uploadedRows] = await Promise.all([
    documentInstanceRepository.findAllByTransactionId(numericTransactionId),
    documentSignatureRepository.findAllWithSignaturesByTransactionId(
      numericTransactionId
    )
  ])

  const generatedInstances = instances.filter(item => item.generated_pdf_path)

  if (!generatedInstances.length && !uploadedRows.length) {
    throw createTransactionError(
      'VALIDATION_ERROR',
      'لا توجد وثائق (GENERATE_PDF أو مرفقات) لدمجها في هذه المعاملة'
    )
  }

  const process = transaction.code
    ? await processRepository.findByCode(transaction.code)
    : null

  const finalQr = buildFinalQr({ transaction, generatedInstances })

  const mergedPdf = await PDFDocument.create()
  const bodyFont = await embedUnicodeFont(mergedPdf)
  const kufiFont = fs.existsSync(KUFI_FONT_PATH)
    ? await embedFontFile(mergedPdf, KUFI_FONT_PATH)
    : bodyFont
  const logoImage = await embedRepublicLogo(mergedPdf)
  const skipped = []

  await drawCoverPage({
    mergedPdf,
    bodyFont,
    kufiFont,
    logoImage,
    transaction,
    processName: process?.name ?? null,
    finalQr
  })

  let mergedGenerated = 0
  let mergedUploaded = 0

  // الترتيب: ملفات file_picker المرفوعة أولاً، ثم ملفات GENERATE_PDF
  for (const row of uploadedRows) {
    if (isSyntheticSignatureDocumentPath(row.file_path)) {
      continue
    }

    const before = mergedPdf.getPageCount()
    await appendFile({
      mergedPdf,
      storedPath: row.file_path,
      label: `uploaded:document#${row.id}`,
      skipped
    })
    if (mergedPdf.getPageCount() > before) {
      mergedUploaded += 1
    }
  }

  for (const instance of generatedInstances) {
    const before = mergedPdf.getPageCount()
    await appendFile({
      mergedPdf,
      storedPath: instance.generated_pdf_path,
      label: `generated:instance#${instance.id}`,
      skipped
    })
    if (mergedPdf.getPageCount() > before) {
      mergedGenerated += 1
    }
  }

  const fileName = `final-merged-${numericTransactionId}-${Date.now()}.pdf`
  const storedPath = `/uploads/${fileName}`
  const absolutePath = resolveAbsoluteUploadPath(storedPath)
  const uploadsDir = path.dirname(absolutePath)

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const pdfBytes = await mergedPdf.save()
  fs.writeFileSync(absolutePath, pdfBytes)

  const contentHash = createHash('sha256').update(pdfBytes).digest('hex')

  const saved = await documentFinalTransactionRepository.upsertForTransaction({
    transactionId: numericTransactionId,
    filePath: storedPath,
    originalName: fileName,
    mimeType: 'application/pdf',
    fileSizeBytes: pdfBytes.length,
    qrPayloadSnapshot: finalQr
      ? { ...finalQr, merged_content_hash: contentHash }
      : { merged_content_hash: contentHash },
    generatedByUserId: userId,
    generatedAt: new Date()
  })

  return {
    transaction_id: numericTransactionId,
    already_exists: false,
    final_document: {
      id: saved.id,
      file_path: saved.file_path,
      file_url: toPublicFileUrl(saved.file_path),
      original_name: saved.original_name,
      mime_type: saved.mime_type,
      file_size_bytes: saved.file_size_bytes,
      content_hash: contentHash,
      generated_at: saved.generated_at
    },
    final_qr: finalQr || {
      available: false,
      message: 'لم يتم تضمين رمز QR (لا توجد وثيقة موقّعة أو مفتاح السلطة غير مهيّأ)'
    },
    merge_summary: {
      generated_documents_merged: mergedGenerated,
      uploaded_files_merged: mergedUploaded,
      total_pages: mergedPdf.getPageCount(),
      skipped,
      readiness: {
        ready_for_merge: readiness.ready_for_merge,
        generate_pdf: readiness.generate_pdf,
        final_qr: readiness.final_qr
      }
    }
  }
}

module.exports = {
  generateMergedFinalDocument,
  buildCoverPdfBytes
}
