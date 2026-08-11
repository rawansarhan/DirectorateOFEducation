'use strict'

const auditLogRepository = require('../../modules/auth/shared/repositories/auditLogRepository')
const securityGuardService = require('./securityGuardService')
const exceptionLogger = require('../logging/exceptionLogger')
//هذه الدالة لتسجيل مدخلات النظام 
async function auditWrite (entry) {
  try {
    return await auditLogRepository.create(entry)
  } catch (err) {
    exceptionLogger.warn({
      message: 'audit_write_failed',
      action: entry?.action || null,
      err
    })
    return null
  }
}
//هذه الدالة لتسجيل حالة النجاح في النظام 
async function auditSuccess (params) {
  try {
    return await securityGuardService.recordSuccess(params)
  } catch (err) {
    exceptionLogger.warn({
      message: 'audit_success_failed',
      action: params?.action || null,
      err
    })
    return null
  }
}
//هذه الدالة لسجيل الحالة الفشل للمستخدم في النظام 
async function auditFailure (params) {
  try {
    return await securityGuardService.recordFailure(params)
  } catch (err) {
    exceptionLogger.warn({
      message: 'audit_failure_failed',
      action: params?.action || null,
      err
    })
    return null
  }
}
//هذه اللدالة لتسجيل الحالة المحظورة للمستخدم في النظام
async function auditBlocked (params) {
  try {
    return await securityGuardService.recordBlocked(params)
  } catch (err) {
    exceptionLogger.warn({
      message: 'audit_blocked_failed',
      action: params?.action || null,
      err
    })
    return null
  }
}

module.exports = {
  auditWrite,
  auditSuccess,
  auditFailure,
  auditBlocked
}
