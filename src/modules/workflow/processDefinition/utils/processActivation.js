'use strict'

function startOfDay (date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayOfYear (month, day) {
  const date = new Date(2000, month - 1, day)
  const start = new Date(2000, 0, 0)
  return Math.floor((date - start) / (24 * 60 * 60 * 1000))
}

function monthDayFromDate (date) {
  const d = startOfDay(date)

  return {
    month: d.getMonth() + 1,
    day: d.getDate()
  }
}

/**
 * هل اليوم الحالي ضمن نافذة سنوية متكررة [start_date .. end_date]؟
 * - تُقارَن شهر/يوم فقط (السنة المخزّنة في DB تُ ignorَe).
 * - بدون end_date: نشط من start_date حتى نهاية السنة.
 * - نافذة عابرة للسنة (مثل 11-01 → 02-15): نشط من start حتى نهاية السنة أو من بداية السنة حتى end.
 */
function isProcessActiveBySchedule (startDate, endDate, now = new Date()) {
  if (!startDate) {
    return false
  }

  const { month: startMonth, day: startDay } = monthDayFromDate(startDate)
  const startDoy = dayOfYear(startMonth, startDay)
  const todayDoy = dayOfYear(now.getMonth() + 1, now.getDate())

  if (!endDate) {
    return todayDoy >= startDoy
  }

  const { month: endMonth, day: endDay } = monthDayFromDate(endDate)
  const endDoy = dayOfYear(endMonth, endDay)

  if (startDoy <= endDoy) {
    return todayDoy >= startDoy && todayDoy <= endDoy
  }

  return todayDoy >= startDoy || todayDoy <= endDoy
}

module.exports = {
  isProcessActiveBySchedule,
  startOfDay,
  dayOfYear,
  monthDayFromDate
}
