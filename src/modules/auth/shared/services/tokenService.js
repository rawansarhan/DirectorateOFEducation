'use strict'

const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const refreshTokenRepository = require('../repositories/refreshTokenRepository')
const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN
} = require('../../../../core/config/env')

// ============================================================
// أدوات مساعدة
// ============================================================

// إنشاء access token قصير العمر (يُستخدم في كل طلب عبر Authorization header)
function signAccessToken (userId) {
  return jwt.sign({ id: userId }, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN
  })
}

// إنشاء refresh token: jti عشوائي + توقيع JWT.
// نُرجع التوكن الخام + الـ jti + تاريخ الانتهاء (للتخزين في DB).
function signRefreshToken (userId) {
  const jti = crypto.randomUUID()

  const token = jwt.sign({ id: userId, jti }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
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
    payload = jwt.verify(rawToken, JWT_REFRESH_SECRET)
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

    // 3) توكن مُبطَل يُستخدم مجدداً: إمّا إعادة إرسال شرعية بعد ضياع الاستجابة،
    //    وإمّا تسريب حقيقي.
    if (stored.revoked_at) {
      // نافذة سماح: التوكن أُبطل بتدوير (له replaced_by_id) قبل ثوانٍ معدودة
      //   => العميل أرسل طلب التجديد ولم تصله الاستجابة (انقطاع شبكة/مهلة)،
      //      فأعاد الإرسال بالتوكن القديم. نُصدر له زوجاً جديداً على رأس سلسلة
      //      التدوير بدل إبادة الجلسات. لا يُضعف كشف التسريب: المهاجم بتوكن
      //      مسروق يحتاج إصابة النافذة الضيقة نفسها، وأي استخدام بعدها يُعامل
      //      كتسريب فيُنهي كل الجلسات.
      const replayed = await resolveReplayWithinGrace(stored, { transaction })

      if (replayed) {
        await transaction.commit()
        return replayed
      }

      // خارج النافذة (أو إبطال بـ logout/كشف سابق) => تسريب محتمل: إنهاء الجلسات.
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
// نافذة السماح لإعادة الإرسال بعد ضياع الاستجابة
// ============================================================

// مهلة اعتبار إعادة الإرسال شرعية بعد التدوير. قصيرة عمداً: تغطّي مهلة العميل
// (30ث) وإعادة محاولته، وتبقى أضيق من أن تفيد مهاجماً بتوكن مسروق.
const REPLAY_GRACE_MS = 60 * 1000

// يعالج توكناً مُبطلاً وصل ضمن نافذة السماح.
// يُرجع زوج توكنات جديداً إن كانت الحالة إعادة إرسال شرعية، وإلّا `null` ليتابع
// المستدعي إلى مسار كشف التسريب.
async function resolveReplayWithinGrace (stored, { transaction }) {
  // إبطال بلا خَلَف = logout أو كشف تسريب سابق، لا تدوير => ليست إعادة إرسال.
  if (!stored.replaced_by_id) {
    return null
  }

  if (Date.now() - new Date(stored.revoked_at).getTime() > REPLAY_GRACE_MS) {
    return null
  }

  // نتتبّع سلسلة التدوير إلى آخر حلقة: قد يكون العميل أعاد الإرسال أكثر من مرة،
  // فتكوّنت عدة حلقات، وآخرها وحدها هي الفعّالة.
  const latest = await findLatestInChain(stored, { transaction })

  // آخر الحلقة مُبطل أيضاً بلا خَلَف (logout أو إنهاء جلسات جرى بعد التدوير)
  // أو منتهي الصلاحية => الجلسة انتهت فعلاً، لا نُحييها.
  if (!latest || latest.revoked_at || new Date() > latest.expires_at) {
    return null
  }

  // لا يمكن إعادة إرسال التوكن الأصلي: لا نخزّن إلا الـ hash. لذلك نُصدر خلَفاً
  // جديداً ونُبطل الحلقة الأخيرة لصالحه — تبقى السلسلة متّصلة وواحدة فعّالة.
  const accessToken = signAccessToken(latest.user_id)
  const { token: newRefreshToken, expiresAt } = signRefreshToken(latest.user_id)

  const newRecord = await refreshTokenRepository.create(
    {
      user_id: latest.user_id,
      token_hash: hashToken(newRefreshToken),
      expires_at: expiresAt,
      user_agent: latest.user_agent,
      ip_address: latest.ip_address
    },
    { transaction }
  )

  await refreshTokenRepository.revoke(latest, {
    replacedById: newRecord.id,
    transaction
  })

  return {
    userId: latest.user_id,
    accessToken,
    refreshToken: newRefreshToken
  }
}

// يتبع replaced_by_id حتى آخر حلقة في سلسلة التدوير.
// السقف يحمي من الدوران اللانهائي لو فسدت السلسلة (حلقة مغلقة).
async function findLatestInChain (token, { transaction }) {
  const MAX_HOPS = 10

  let current = token

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    if (!current.replaced_by_id) {
      return current
    }

    const next = await refreshTokenRepository.findById(current.replaced_by_id, {
      transaction
    })

    // خَلَف مفقود (حُذف بالتنظيف مثلاً) => لا يمكن التحقق، عامله كفشل.
    if (!next) {
      return null
    }

    current = next
  }

  return null
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
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET
}
