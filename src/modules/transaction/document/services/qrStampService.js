'use strict'

/**
 * =============================================================================
 * qrStampService — توليد رمز QR موقّع وحقنه في الـ PDF المولّد
 * =============================================================================
 *
 * محتوى الرمز: رابط تحقق عام موقّع. كل مسح يُصدر رمز تفاصيل جديد (6 أرقام، 5 دقائق)
 * عبر GET /api/verify/document ثم GET /api/verify/document/details مع Bearer token.
 *
 *   <API>/api/verify/document?v=1&tx=<id>&g=<genesis>&doc=<instanceId>&s=<sig>
 */

const QRCode = require('qrcode')
const { signDocumentBinding } = require('../../integrityChain/services/authoritySignatureService')

const DEFAULT_QR_SIZE = 90
const DEFAULT_QR_MARGIN = 24
const MIN_QR_SIZE = 48
const MAX_QR_SIZE = 240

function resolveQrSettings (configJson = {}) {
  const qr = (configJson.pdf && configJson.pdf.qr) || {}

  const rawSize = Number(qr.size)
  const size = Number.isFinite(rawSize)
    ? Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, rawSize))
    : DEFAULT_QR_SIZE

  const rawMargin = Number(qr.margin)
  const margin = Number.isFinite(rawMargin) && rawMargin >= 0
    ? rawMargin
    : DEFAULT_QR_MARGIN

  return {
    enabled: qr.enabled !== false,
    size,
    margin,
    position: qr.position || 'bottom-right'
  }
}

function buildVerificationUrl ({
  apiBaseUrl,
  transactionId,
  genesisHash,
  documentInstanceId,
  signatureBase64Url
}) {
  const base = String(apiBaseUrl || '').replace(/\/$/, '')
  const params = new URLSearchParams({
    v: '1',
    tx: String(transactionId),
    g: String(genesisHash),
    doc: String(documentInstanceId),
    s: String(signatureBase64Url)
  })

  return `${base}/api/verify/document?${params.toString()}`
}

async function generateQrPngBuffer (text, size) {
  return QRCode.toBuffer(text, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: Math.round(size * 4)
  })
}

function computeQrRectangle ({ page, size, margin, position }) {
  const { width, height } = page.getSize()

  let x = width - size - margin
  let y = margin

  if (position === 'bottom-left') {
    x = margin
    y = margin
  } else if (position === 'top-right') {
    x = width - size - margin
    y = height - size - margin
  } else if (position === 'top-left') {
    x = margin
    y = height - size - margin
  }

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    size
  }
}

async function injectIntegrityQr ({
  pdfDoc,
  configJson = {},
  transactionId,
  genesisHash,
  documentInstanceId,
  apiBaseUrl
}) {
  const settings = resolveQrSettings(configJson)

  if (!settings.enabled) {
    return { enabled: false }
  }

  if (!genesisHash) {
    throw new Error('genesis_hash مطلوب لحقن رمز QR في الـ PDF')
  }

  const signatureBase64Url = signDocumentBinding({
    transactionId,
    genesisHash,
    documentInstanceId
  })

  const verificationUrl = buildVerificationUrl({
    apiBaseUrl,
    transactionId,
    genesisHash,
    documentInstanceId,
    signatureBase64Url
  })

  const qrPng = await generateQrPngBuffer(verificationUrl, settings.size)
  const qrImage = await pdfDoc.embedPng(qrPng)

  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]

  const rect = computeQrRectangle({
    page: lastPage,
    size: settings.size,
    margin: settings.margin,
    position: settings.position
  })

  lastPage.drawImage(qrImage, {
    x: rect.x,
    y: rect.y,
    width: rect.size,
    height: rect.size
  })

  return {
    enabled: true,
    verification_url: verificationUrl,
    signature: signatureBase64Url,
    placement: {
      page_index: pages.length - 1,
      ...rect
    }
  }
}

module.exports = {
  resolveQrSettings,
  buildVerificationUrl,
  injectIntegrityQr
}
