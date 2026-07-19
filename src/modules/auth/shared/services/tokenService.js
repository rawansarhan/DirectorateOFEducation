'use strict'

const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const refreshTokenRepository = require('../repositories/refreshTokenRepository')

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET ||
  'your_very_secret_key'

const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  (process.env.JWT_SECRET
    ? process.env.JWT_SECRET + '_refresh'
    : 'your_very_secret_refresh_key')

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h'
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'

// ============================================================
// أدوات مساعدة
// ============================================================

// إنشاء access token قصير العمر (يُستخدم في كل طلب عبر Authorization header)
function signAccessToken (userId) {
  return jwt.sign({ id: userId }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN
  })
}

// إنشاء refresh token: jti عشوائي + توقيع JWT.
// نُرجع التوكن الخام + الـ jti + تاريخ الانتهاء (للتخزين في DB).
function signRefreshToken (userId) {
  const jti = crypto.randomUUID()

  const token = jwt.sign({ id: userId, jti }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN
  })

  const decoded = jwt.decode(token)
  const expiresAt = new Date(decoded.exp * 1000)

  return { token, jti, expiresAt }
}

// hash التوكن قبل تخزينه (لا نخزّن التوكن الخام أبداً)
function hashToken (token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ============================================================
// إصدار زوج التوكنات (access + refresh) وتخزين الـ refresh في DB
// ============================================================
async function issueTokens (userId, clientMeta = {}, options = {}) {
  const accessToken = signAccessToken(userId)

  const { token: refreshToken, expiresAt } = signRefreshToken(userId)

  await refreshTokenRepository.create(
    {
      user_id: userId,
      token_hash: hashToken(refreshToken),
      expires_at: expiresAt,
      user_agent: clientMeta.userAgent || null,
      ip_address: clientMeta.ip || null
    },
    options
  )

  return { accessToken, refreshToken }
}

// ============================================================
// تجديد التوكن مع التدوير وكشف إعادة الاستخدام
// ============================================================
async function rotateRefreshToken (rawToken, clientMeta = {}) {
  if (!rawToken) {
    throw buildAuthError('Refresh token مطلوب')
  }

  // 1) التحقق من توقيع وصلاحية الـ JWT
  let payload
  try {
    payload = jwt.verify(rawToken, REFRESH_SECRET)
  } catch (err) {
    throw buildAuthError('Refresh token غير صالح أو منتهي')
  }

  const sequelize = refreshTokenRepository.getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const tokenHash = hashToken(rawToken)

    // 2) البحث عن التوكن في DB مع قفل الصف لمنع التدوير المتزامن
    const stored = await refreshTokenRepository.findByHash(tokenHash, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    // التوكن صالح التوقيع لكنه غير موجود في DB => مرفوض
    if (!stored) {
      await transaction.commit()
      throw buildAuthError('Refresh token غير معروف')
    }

    // 3) كشف إعادة الاستخدام: توكن مُبطَل سابقاً يُستخدم مجدداً
    //    => تسريب محتمل، نُبطل كل جلسات المستخدم
    if (stored.revoked_at) {
      await refreshTokenRepository.revokeAllForUser(stored.user_id, {
        transaction
      })
      await transaction.commit()
      throw buildAuthError(
        'تم كشف إعادة استخدام التوكن. تم إنهاء جميع الجلسات لأسباب أمنية'
      )
    }

    // 4) التحقق من انتهاء الصلاحية على مستوى DB
    if (new Date() > stored.expires_at) {
      await refreshTokenRepository.revoke(stored, { transaction })
      await transaction.commit()
      throw buildAuthError('Refresh token منتهي الصلاحية')
    }

    // 5) إصدار زوج جديد وتخزينه ضمن نفس المعاملة
    const accessToken = signAccessToken(stored.user_id)
    const { token: newRefreshToken, expiresAt } = signRefreshToken(
      stored.user_id
    )

    const newRecord = await refreshTokenRepository.create(
      {
        user_id: stored.user_id,
        token_hash: hashToken(newRefreshToken),
        expires_at: expiresAt,
        user_agent: clientMeta.userAgent || null,
        ip_address: clientMeta.ip || null
      },
      { transaction }
    )

    // 6) إبطال التوكن القديم وربطه بالجديد (سلسلة التدوير)
    await refreshTokenRepository.revoke(stored, {
      replacedById: newRecord.id,
      transaction
    })

    await transaction.commit()

    return {
      userId: stored.user_id,
      accessToken,
      refreshToken: newRefreshToken
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback()
    }
    throw error
  }
}

// ============================================================
// إبطال refresh token واحد (logout)
// ============================================================
async function revokeRefreshToken (rawToken) {
  if (!rawToken) {
    return { revoked: false }
  }

  const stored = await refreshTokenRepository.findByHash(hashToken(rawToken))

  if (!stored || stored.revoked_at) {
    return { revoked: false }
  }

  await refreshTokenRepository.revoke(stored)

  return { revoked: true }
}

// إبطال كل جلسات المستخدم (logout من كل الأجهزة)
async function revokeAllForUser (userId) {
  await refreshTokenRepository.revokeAllForUser(userId)
  return { revoked: true }
}

// خطأ مصادقة موحّد (يلتقطه الكنترولر ويُرجعه كـ 401)
function buildAuthError (message) {
  const error = new Error(message)
  error.statusCode = 401
  return error
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken,
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  ACCESS_SECRET,
  REFRESH_SECRET
}
