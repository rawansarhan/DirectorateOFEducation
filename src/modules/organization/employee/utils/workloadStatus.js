'use strict'

const WORKLOAD_STATUS = Object.freeze({
  INACTIVE: 'inactive',
  LOW_ACTIVE: 'low_active',
  ACTIVE: 'active',
  OVERLOADED: 'overloaded'
})

const WORKLOAD_STATUS_LABELS = Object.freeze({
  inactive: 'غير نشط',
  low_active: 'قليل النشاط',
  active: 'نشط',
  overloaded: 'مثقل'
})

function resolveWorkloadStatus (percent) {
  const value = Number(percent)

  if (!Number.isFinite(value) || value <= 0) {
    return {
      status: WORKLOAD_STATUS.INACTIVE,
      status_label: WORKLOAD_STATUS_LABELS.inactive
    }
  }

  if (value <= 20) {
    return {
      status: WORKLOAD_STATUS.LOW_ACTIVE,
      status_label: WORKLOAD_STATUS_LABELS.low_active
    }
  }

  if (value <= 60) {
    return {
      status: WORKLOAD_STATUS.ACTIVE,
      status_label: WORKLOAD_STATUS_LABELS.active
    }
  }

  return {
    status: WORKLOAD_STATUS.OVERLOADED,
    status_label: WORKLOAD_STATUS_LABELS.overloaded
  }
}

module.exports = {
  WORKLOAD_STATUS,
  WORKLOAD_STATUS_LABELS,
  resolveWorkloadStatus
}
