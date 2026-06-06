'use strict'

/**
 * يحوّل إدخال شهر-يوم (MM-DD) إلى Date باستخدام السنة الحالية.
 * يقبل أي شهر ويوم صالحين دون قيد على التاريخ بالنسبة لليوم الحالي.
 *
 * @param {string} input - مثال: "03-15" أو "3-5"
 * @param {string} [fieldName]
 * @returns {Date}
 */
function parseMonthDayToCurrentYearDate (input, fieldName = 'التاريخ') {
  if (input == null || input === '') {
    throw new Error(`${fieldName} مطلوب`)
  }

  const str = String(input).trim()
  const match = str.match(/^(\d{1,2})-(\d{1,2})$/)
  if (!match) {
    throw new Error(`${fieldName} يجب أن يكون بصيغة MM-DD (شهر-يوم)`)
  }

  const month = Number(match[1])
  const day = Number(match[2])

  if (month < 1 || month > 12) {
    throw new Error(`${fieldName}: الشهر يجب أن يكون بين 1 و 12`)
  }

  const year = new Date().getFullYear()
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`${fieldName}: اليوم غير صالح لهذا الشهر`)
  }

  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = {
  parseMonthDayToCurrentYearDate
}
