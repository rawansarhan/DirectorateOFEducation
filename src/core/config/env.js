'use strict'

const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

function required (name) {
  const value = process.env[name]

  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${name} is not defined in .env`)
  }

  return String(value).trim()
}

function optional (name) {
  const value = process.env[name]

  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined
  }

  return String(value).trim()
}

function intRequired (name) {
  const value = Number(required(name))

  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a number in .env`)
  }

  return value
}

function intOptional (name, defaultValue) {
  const raw = optional(name)

  if (raw === undefined) {
    return defaultValue
  }

  const value = Number(raw)

  if (Number.isNaN(value)) {
    throw new Error(`${name} must be a number in .env`)
  }

  return value
}

function stripQuotes (value) {
  return String(value).replace(/^"|"$/g, '')
}

const PORT = intRequired('PORT')

module.exports = {
  NODE_ENV: optional('NODE_ENV') || 'development',

  PORT,
  API_PUBLIC_URL: optional('API_PUBLIC_URL') || `http://localhost:${PORT}`,

  DB_HOST: required('DB_HOST'),
  DB_PORT: intRequired('DB_PORT'),
  DB_NAME: required('DB_NAME'),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: stripQuotes(required('DB_PASSWORD')),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN') || optional('JWT_ACCESS_EXPIRES_IN') || '1h',

  // مفتاح سلطة الإصدار (Ed25519) — يوقّع به الخادم محتوى رمز QR في الـ PDF.
  // اختياري عند الإقلاع؛ لكنه مطلوب فعلياً وقت توليد PDF (يُرمى خطأ واضح حينها).
  // ولّد الزوج عبر: npm run keys:authority
  INTEGRITY_AUTHORITY_PRIVATE_KEY: optional('INTEGRITY_AUTHORITY_PRIVATE_KEY'),
  INTEGRITY_AUTHORITY_PUBLIC_KEY: optional('INTEGRITY_AUTHORITY_PUBLIC_KEY'),

  EMAIL_USER: required('EMAIL_USER'),
  EMAIL_PASS: required('EMAIL_PASS'),

  CLOUDINARY_CLOUD_NAME: optional('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: optional('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: optional('CLOUDINARY_API_SECRET'),

  CAMUNDA_URL: required('CAMUNDA_URL'),

  TRACCAR_URL: required('TRACCAR_URL'),
  TRACCAR_TOKEN: required('TRACCAR_TOKEN'),

  REDIS_URL: optional('REDIS_URL'),

  TRANSACTION_SERVICE_URL: required('TRANSACTION_SERVICE_URL'),
  WORKFLOW_SERVICE_URL: required('WORKFLOW_SERVICE_URL'),
  ORGANIZATION_SERVICE_URL: required('ORGANIZATION_SERVICE_URL'),
  AUTH_SERVICE_URL: required('AUTH_SERVICE_URL'),

  API_CACHE_TTL_SECONDS: intOptional('API_CACHE_TTL_SECONDS', 3600),
  PROCESS_CACHE_TTL_SECONDS: intOptional('PROCESS_CACHE_TTL_SECONDS', 3600),
  EMPLOYEE_TASKS_CACHE_TTL_SECONDS: intOptional('EMPLOYEE_TASKS_CACHE_TTL_SECONDS', 60),
  FINAL_DOCUMENT_CACHE_TTL_SECONDS: intOptional('FINAL_DOCUMENT_CACHE_TTL_SECONDS', 3600),
  TASK_DETAILS_CACHE_TTL_SECONDS: intOptional('TASK_DETAILS_CACHE_TTL_SECONDS', 30),
  CURRENT_STAGE_CACHE_TTL_SECONDS: intOptional('CURRENT_STAGE_CACHE_TTL_SECONDS', 600),

  OPERATION_MIN_INTERVAL_MS: intRequired('OPERATION_MIN_INTERVAL_MS'),
  IDEMPOTENCY_TTL_MS: intRequired('IDEMPOTENCY_TTL_MS'),
  OPERATION_GUARD_CLEANUP_MS: intRequired('OPERATION_GUARD_CLEANUP_MS'),

  SECURITY_MAX_FAILED_ATTEMPTS: intRequired('SECURITY_MAX_FAILED_ATTEMPTS'),
  SECURITY_LOCK_DURATION_MS: intRequired('SECURITY_LOCK_DURATION_MS'),

  RATE_LIMIT_AUTH_WINDOW_MS: intRequired('RATE_LIMIT_AUTH_WINDOW_MS'),
  RATE_LIMIT_AUTH_MAX: intRequired('RATE_LIMIT_AUTH_MAX'),
  RATE_LIMIT_AUTH_BRUTE_WINDOW_MS: intRequired('RATE_LIMIT_AUTH_BRUTE_WINDOW_MS'),
  RATE_LIMIT_AUTH_BRUTE_MAX: intRequired('RATE_LIMIT_AUTH_BRUTE_MAX'),
  RATE_LIMIT_SIGN_WINDOW_MS: intRequired('RATE_LIMIT_SIGN_WINDOW_MS'),
  RATE_LIMIT_SIGN_MAX: intRequired('RATE_LIMIT_SIGN_MAX'),
  RATE_LIMIT_COMPLETE_WINDOW_MS: intRequired('RATE_LIMIT_COMPLETE_WINDOW_MS'),
  RATE_LIMIT_COMPLETE_MAX: intRequired('RATE_LIMIT_COMPLETE_MAX'),
  RATE_LIMIT_SUBMIT_WINDOW_MS: intRequired('RATE_LIMIT_SUBMIT_WINDOW_MS'),
  RATE_LIMIT_SUBMIT_MAX: intRequired('RATE_LIMIT_SUBMIT_MAX'),

  RATE_LIMIT_UPLOAD_WINDOW_MS: intOptional('RATE_LIMIT_UPLOAD_WINDOW_MS', 60 * 1000),
  RATE_LIMIT_UPLOAD_MAX: intOptional('RATE_LIMIT_UPLOAD_MAX', 15),
  TRANSACTION_UPLOAD_DAILY_MAX_FILES: intOptional('TRANSACTION_UPLOAD_DAILY_MAX_FILES', 50),
  TRANSACTION_UPLOAD_DAILY_MAX_MB: intOptional('TRANSACTION_UPLOAD_DAILY_MAX_MB', 200),
  TRANSACTION_FILE_MAX_MB: intOptional('TRANSACTION_FILE_MAX_MB', 25),

  TASK_LOCK_TTL_MS: intOptional('TASK_LOCK_TTL_MS', 15 * 60 * 1000),

  AUTH_CHALLENGE_TTL_MS: intRequired('AUTH_CHALLENGE_TTL_MS'),
  PIN_SESSION_TTL_MS: intRequired('PIN_SESSION_TTL_MS'),
  TX_SIGN_TTL_MS: intRequired('TX_SIGN_TTL_MS'),

  OTP_TTL_MINUTES: intOptional('OTP_TTL_MINUTES', 10),
  BCRYPT_ROUNDS: intOptional('BCRYPT_ROUNDS', 10),

  OUTBOX_POLL_INTERVAL_MS: intRequired('OUTBOX_POLL_INTERVAL_MS'),
  PROCESS_ACTIVATION_CRON: required('PROCESS_ACTIVATION_CRON'),

  RETRY_MAX_ATTEMPTS: intOptional('RETRY_MAX_ATTEMPTS', 3),
  RETRY_BASE_DELAY_MS: intOptional('RETRY_BASE_DELAY_MS', 300),
  RETRY_MAX_DELAY_MS: intOptional('RETRY_MAX_DELAY_MS', 5000)
}
