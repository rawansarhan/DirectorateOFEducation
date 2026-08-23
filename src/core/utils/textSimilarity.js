'use strict'

/**
 * تشابه نصي محسَّن للعربي/الإنجليزي:
 * - توحيد الألف والحركات والمسافات
 * - تشابه الحروف (Levenshtein ratio)
 * - تشابه المعنى التقريبي عبر تقاطع الكلمات (Jaccard / Dice)
 */

const { normalizeArabicAlef } = require('./escapeLike')

const DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TATWEEL_RE = /\u0640/g
const NON_WORD_RE = /[^\p{L}\p{N}\s]+/gu

function normalizeSearchText (value) {
  return normalizeArabicAlef(String(value ?? ''))
    .toLowerCase()
    .replace(DIACRITICS_RE, '')
    .replace(TATWEEL_RE, '')
    .replace(NON_WORD_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize (value) {
  const normalized = normalizeSearchText(value)
  if (!normalized) return []
  return normalized.split(' ').filter(token => token.length > 1)
}

function levenshteinDistance (a, b) {
  const s = String(a || '')
  const t = String(b || '')

  if (s === t) return 0
  if (!s.length) return t.length
  if (!t.length) return s.length

  const prev = new Array(t.length + 1)
  const curr = new Array(t.length + 1)

  for (let j = 0; j <= t.length; j += 1) {
    prev[j] = j
  }

  for (let i = 1; i <= s.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      )
    }
    for (let j = 0; j <= t.length; j += 1) {
      prev[j] = curr[j]
    }
  }

  return prev[t.length]
}

function letterSimilarity (a, b) {
  const left = normalizeSearchText(a)
  const right = normalizeSearchText(b)

  if (!left && !right) return 1
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length)
    const longer = Math.max(left.length, right.length)
    return shorter / longer
  }

  const distance = levenshteinDistance(left, right)
  const maxLen = Math.max(left.length, right.length)
  return Math.max(0, 1 - distance / maxLen)
}

function tokenSimilarity (a, b) {
  const left = new Set(tokenize(a))
  const right = new Set(tokenize(b))

  if (!left.size && !right.size) return 1
  if (!left.size || !right.size) return 0

  let intersection = 0
  for (const token of left) {
    if (right.has(token)) intersection += 1
  }

  const union = left.size + right.size - intersection
  const jaccard = union ? intersection / union : 0
  const dice = (2 * intersection) / (left.size + right.size)

  // أقرب معنى عبر تداخل الكلمات
  return Math.max(jaccard, dice)
}

/**
 * درجة تشابه مركّبة بين عنوانين (0..1)
 * letter ≈ الشكل الحرفي، token ≈ المعنى بالمفردات المشتركة
 */
function combinedTitleSimilarity (queryTitle, candidateTitle) {
  const letter = letterSimilarity(queryTitle, candidateTitle)
  const token = tokenSimilarity(queryTitle, candidateTitle)
  const score = 0.45 * letter + 0.55 * token
  return Math.round(score * 1000) / 1000
}

function isStrongTitleMatch (queryTitle, candidateTitle, threshold = 0.62) {
  return combinedTitleSimilarity(queryTitle, candidateTitle) >= threshold
}

module.exports = {
  normalizeSearchText,
  tokenize,
  letterSimilarity,
  tokenSimilarity,
  combinedTitleSimilarity,
  isStrongTitleMatch
}
