'use strict'

const {
  toPublicDocumentVerifyDTO
} = require('../mappers/integrityChainMapper')

function escapeHtml (value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatVerifiedAt (value) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString('ar-SY', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function wantsHtmlResponse (req) {
  const format = String(req.query?.format || '').trim().toLowerCase()
  return format !== 'json'
}

/**
 * نتيجة عامة للمسح — بدون تفاصيل تقنية أو موقّعين.
 * عند النجاح يُضاف details_code لاستخدامه في API التفاصيل.
 */
function buildPublicVerifyResult (result, transaction = null, detailsMeta = null) {
  const valid = Boolean(result?.valid)

  const payload = {
    valid,
    message: valid
      ? 'الوثيقة صحيحة وسلسلة التواقيع صالحة'
      : (result?.reason || 'الوثيقة غير صالحة أو سلسلة التواقيع غير مكتملة'),
    verified_at: result?.verified_at || new Date()
  }

  if (transaction) {
    payload.identity = {
      first_name: transaction.first_name ?? null,
      last_name: transaction.last_name ?? null,
      father_name: transaction.father_name ?? null,
      mother_name: transaction.mother_name ?? null,
      national_id: transaction.national_id ?? null
    }
  }

  if (valid && detailsMeta?.details_code) {
    payload.details_code = detailsMeta.details_code
    payload.details_code_expires_in_seconds =
      detailsMeta.expires_in_seconds ?? null
  }

  return toPublicDocumentVerifyDTO(payload)
}

function renderIdentityRow (label, value) {
  return `
    <div class="identity-row">
      <span class="identity-label">${escapeHtml(label)}</span>
      <span class="identity-value">${escapeHtml(value || '—')}</span>
    </div>
  `
}

function renderDocumentVerifyHtml (payload) {
  const valid = Boolean(payload?.valid)
  const statusClass = valid ? 'status-valid' : 'status-invalid'
  const statusIcon = valid ? '✓' : '✕'
  const identity = payload?.identity || {}
  const verifiedAt = formatVerifiedAt(payload?.verified_at)
  const detailsCode = payload?.details_code || null
  const expiresIn = payload?.details_code_expires_in_seconds

  const detailsCodeHtml =
    valid && detailsCode
      ? `
    <div class="section">
      <h2 class="section-title">رمز التفاصيل</h2>
      <p class="code-hint">
        للاطلاع على تفاصيل المعاملة (الموقّعون، السجل، الوثيقة النهائية)
        استخدم هذا الرمز في واجهة التفاصيل أو API التفاصيل.
      </p>
      <div class="code-box">${escapeHtml(detailsCode)}</div>
      ${
        expiresIn
          ? `<div class="code-meta">صالح لمدة ${escapeHtml(String(Math.round(expiresIn / 60)))} دقيقة تقريباً</div>`
          : ''
      }
    </div>`
      : ''

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>التحقق من الوثيقة</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      background: linear-gradient(180deg, #f4f7fb 0%, #e8eef5 100%);
      color: #1f2937;
      padding: 24px 16px;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .header {
      padding: 24px 24px 16px;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
    }
    .header h1 {
      margin: 0 0 8px;
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
    }
    .header p {
      margin: 0;
      font-size: 0.9rem;
      color: #64748b;
    }
    .status {
      margin: 20px 24px 0;
      padding: 18px 16px;
      border-radius: 12px;
      text-align: center;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.6;
    }
    .status-valid {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .status-invalid {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .status-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      margin-bottom: 8px;
      border-radius: 50%;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .status-valid .status-icon { background: #d1fae5; }
    .status-invalid .status-icon { background: #fee2e2; }
    .section {
      padding: 24px;
    }
    .section-title {
      margin: 0 0 16px;
      font-size: 0.95rem;
      font-weight: 700;
      color: #334155;
      text-align: center;
    }
    .identity-grid {
      display: grid;
      gap: 14px;
    }
    .identity-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 12px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .identity-label {
      font-size: 0.9rem;
      color: #64748b;
      white-space: nowrap;
    }
    .identity-value {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      text-align: left;
      word-break: break-word;
    }
    .code-hint {
      margin: 0 0 12px;
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.7;
      text-align: center;
    }
    .code-box {
      padding: 14px 12px;
      border-radius: 10px;
      background: #0f172a;
      color: #f8fafc;
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.72rem;
      line-height: 1.5;
      word-break: break-all;
      text-align: center;
      direction: ltr;
    }
    .code-meta {
      margin-top: 10px;
      text-align: center;
      font-size: 0.8rem;
      color: #64748b;
    }
    .footer {
      padding: 0 24px 24px;
      text-align: center;
      font-size: 0.82rem;
      color: #94a3b8;
      line-height: 1.6;
    }
    .hint {
      margin-top: 12px;
      padding: 12px;
      border-radius: 10px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 0.85rem;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>مديرية التربية — التحقق من الوثيقة</h1>
      <p>نتيجة مسح رمز QR المضمّن في الوثيقة</p>
    </div>

    <div class="status ${statusClass}">
      <div class="status-icon">${statusIcon}</div>
      <div>${escapeHtml(payload?.message || '')}</div>
    </div>

    ${
      valid && identity
        ? `
    <div class="section">
      <h2 class="section-title">بيانات الهوية — للمطابقة مع الوثيقة الورقية</h2>
      <div class="identity-grid">
        ${renderIdentityRow('الاسم الأول', identity.first_name)}
        ${renderIdentityRow('الاسم الأخير', identity.last_name)}
        ${renderIdentityRow('اسم الأب', identity.father_name)}
        ${renderIdentityRow('اسم الأم', identity.mother_name)}
        ${renderIdentityRow('الرقم الوطني', identity.national_id)}
      </div>
      <div class="hint">
        تأكد أن الأسماء والرقم الوطني أعلاه يطابقان ما هو مطبوع في الوثيقة التي بحوزتك.
      </div>
    </div>
    ${detailsCodeHtml}
    `
        : ''
    }

    <div class="footer">
      ${verifiedAt ? `تاريخ التحقق: ${escapeHtml(verifiedAt)}` : ''}
      <div>هذه الصفحة للتحقق العام فقط — التفاصيل عبر رمز التفاصيل وواجهة مخصصة.</div>
    </div>
  </div>
</body>
</html>`
}

function renderDocumentVerifyErrorHtml ({ message, statusCode = 400 }) {
  return renderDocumentVerifyHtml({
    valid: false,
    message: message || 'تعذّر التحقق من الوثيقة',
    verified_at: new Date(),
    identity: null,
    _statusCode: statusCode
  })
}

module.exports = {
  wantsHtmlResponse,
  buildPublicVerifyResult,
  renderDocumentVerifyHtml,
  renderDocumentVerifyErrorHtml
}
