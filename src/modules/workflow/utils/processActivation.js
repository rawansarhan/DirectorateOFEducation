'use strict'

function startOfDay (date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * active when start_date is today or earlier, and end_date (if set) is not before today.
 */
function isProcessActiveBySchedule (startDate, endDate, now = new Date()) {
  if (!startDate) {
    return false
  }

  const today = startOfDay(now)
  const start = startOfDay(startDate)

  if (start > today) {
    return false
  }

  if (endDate) {
    const end = startOfDay(endDate)
    if (end < today) {
      return false
    }
  }

  return true
}

module.exports = {
  isProcessActiveBySchedule,
  startOfDay
}
