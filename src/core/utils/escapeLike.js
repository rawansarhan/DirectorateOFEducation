'use strict'

/**
 * Escape LIKE wildcards for safe prefix/contains search.
 * Use with Sequelize Op.iLike / Op.like and ESCAPE '\\' (Postgres default).
 *
 * likeContains يستخدم أيضاً مطابقة أشكال الألف العربية:
 * ا / أ / إ / آ / ٱ تُعامل كحرف واحد عند البحث.
 */

const ARABIC_ALEF_CLASS = '[اأإآٱ]'
const ARABIC_ALEF_RE = /[اأإآٱ]/g

function escapeLike (value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

function escapeRegExp (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** يوحّد كل أشكال الألف إلى ا للمقارنة النصية داخل الذاكرة */
function normalizeArabicAlef (value) {
  return String(value ?? '').replace(ARABIC_ALEF_RE, 'ا')
}

/**
 * نمط PostgreSQL ~* (iRegexp) لبحث يحتوي النص مع تجاهل اختلاف أشكال الألف.
 * مثال: "أحمد" ↔ "احمد" ↔ "إحمد"
 */
function arabicAlefInsensitiveContainsPattern (value) {
  const escaped = escapeRegExp(String(value ?? ''))
  const withAlefClass = escaped.replace(ARABIC_ALEF_RE, ARABIC_ALEF_CLASS)
  return `.*${withAlefClass}.*`
}

function likeContains (value) {
  const { Op } = require('sequelize')
  return { [Op.iRegexp]: arabicAlefInsensitiveContainsPattern(value) }
}

/** مقارنة تحتوي نصاً مع توحيد الألف (للبحث داخل الذاكرة) */
function arabicIncludes (haystack, needle) {
  const hay = normalizeArabicAlef(String(haystack ?? '').toLowerCase())
  const n = normalizeArabicAlef(String(needle ?? '').trim().toLowerCase())
  if (!n) return true
  return hay.includes(n)
}

module.exports = {
  escapeLike,
  escapeRegExp,
  likeContains,
  normalizeArabicAlef,
  arabicAlefInsensitiveContainsPattern,
  arabicIncludes
}
